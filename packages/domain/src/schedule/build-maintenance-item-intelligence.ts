import { findMatchingServices } from "../knowledge/match-service-name.js";
import type { ServiceAliasRegistry } from "../knowledge/service-alias-registry.js";
import type { OwnerContextMemory, TireRotationConditionId } from "../owner-context/types.js";
import type { ServiceTimelineEntry } from "../projections/types.js";
import type { ScheduleProjectionRow } from "./project-maintenance-schedule.js";
import {
  resolveTireRotationEvidence,
  sortServiceTimeline,
  type TireRotationEvidence,
} from "./resolve-tire-rotation-evidence.js";

export type QualitativeConfidence = "high" | "medium" | "low" | "not_scored";
export type EvidenceState = "available" | "missing" | "upcoming" | "not_applicable";

export type MaintenanceRationaleAxisId =
  | "vehicle_oem"
  | "service_history"
  | "owner_use_preferences"
  | "condition_setup";

export type MaintenanceRationaleAxis = {
  id: MaintenanceRationaleAxisId;
  label: string;
  state: EvidenceState;
  summary: string;
};

export type IntervalRecommendation = {
  status: "active" | "upcoming";
  recommendedMiles: number | null;
  projectedDueMileage: number | null;
  recentGapsMiles: number[];
  recentAverageMiles: number | null;
  recentMedianMiles: number | null;
  evidenceNote: string;
  rationale: string;
  confidence: QualitativeConfidence;
  activeSource: "owner" | "oem";
  activeLabel: string;
};

export type ActionRecommendation = {
  status: "active" | "needs_input" | "upcoming";
  method: "diy" | "mobile_service" | "local_shop" | "tire_retailer" | "dealer" | null;
  providerName: string | null;
  providerLocation: string | null;
  expectedTimeLabel: string;
  expectedCost: {
    amount: number | null;
    currency: "USD";
    label: string;
    basis: "owner_confirmed" | "observed_history" | "unknown";
    requiresConfirmation: boolean;
  };
  whyThisOption: string[];
  ownerFit: string[];
  confidence: {
    provider: QualitativeConfidence;
    cost: QualitativeConfidence;
    booking: QualitativeConfidence;
  };
  nextAction: {
    label: string;
    url: string | null;
    verifiedAt: string | null;
  };
  evidenceIds: string[];
  confirmationPrompt: string | null;
};

export type MaintenanceItemIntelligence = {
  itemKind: "tire_rotation" | "general";
  whyNow: string;
  reminderConfidence: QualitativeConfidence;
  axes: MaintenanceRationaleAxis[];
  intervalRecommendation: IntervalRecommendation;
  actionRecommendation: ActionRecommendation;
};

type BuildMaintenanceItemIntelligenceInput = {
  row: ScheduleProjectionRow;
  timeline: ServiceTimelineEntry[];
  currentMileage: number;
  effectiveMilesPerYear: number;
  ownerContextMemory?: OwnerContextMemory | null;
  canonicalServiceId?: string | null;
  serviceAliasRegistry?: ServiceAliasRegistry | null;
};

const TIRE_ROTATION_SERVICE_ID = "generic.tire_rotation";
const COSTCO_TIRE_URL = "https://tires.costco.com/";
const COSTCO_TIRE_URL_VERIFIED_AT = "2026-07-30";

const normalizeProvider = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const roundToNearest = (value: number, increment: number): number =>
  Math.max(increment, Math.round(value / increment) * increment);

const average = (values: number[]): number | null =>
  values.length > 0
    ? Math.round(values.reduce((total, value) => total + value, 0) / values.length)
    : null;

const formatMiles = (value: number): string => `${value.toLocaleString("en-US")} mi`;

const formatPriority = (value: string): string =>
  value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const isStable = (values: number[]): boolean => {
  const center = average(values);
  if (center === null || center <= 0 || values.length < 2) return false;
  return values.every((value) => Math.abs(value - center) / center <= 0.15);
};

const formatOemInterval = (row: ScheduleProjectionRow): string => {
  const parts: string[] = [];
  if (row.oemInterval.miles !== null) parts.push(formatMiles(row.oemInterval.miles));
  if (row.oemInterval.months !== null) parts.push(`${row.oemInterval.months} mo`);
  return parts.length > 0 ? parts.join(" / ") : "adaptive Maintenance Minder";
};

const reminderConfidence = (
  value: ScheduleProjectionRow["dueDateConfidence"],
): QualitativeConfidence => {
  if (value === "oem_calendar") return "high";
  if (value === "mileage_converted") return "medium";
  return "low";
};

const buildWhyNow = (row: ScheduleProjectionRow, currentMileage: number): string => {
  if (row.dueMileage !== null) {
    const remaining = row.dueMileage - currentMileage;
    if (remaining < 0) {
      return `Current ${formatMiles(currentMileage)} · target ${formatMiles(row.dueMileage)} · ${formatMiles(Math.abs(remaining))} overdue`;
    }
    return `Current ${formatMiles(currentMileage)} · target ${formatMiles(row.dueMileage)} · ${formatMiles(remaining)} remaining`;
  }
  if (row.dueDate) return `Due ${row.dueDate} from the active ${formatOemInterval(row)} rule`;
  return "A service baseline is still needed before VehicleOS can calculate when this is due.";
};

const conditionLabels: Record<TireRotationConditionId, string> = {
  uneven_tread: "uneven tread",
  pressure_or_tpms: "pressure or TPMS",
  pull_vibration_or_cupping: "pull, vibration, or cupping",
  special_tire_setup: "special tire setup",
};

const parseMoney = (value: string): number | null => {
  const normalized = value.replace(/[^0-9.-]/g, "");
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildActionRecommendation = (input: {
  tireEvidence: TireRotationEvidence;
  ownerContextMemory?: OwnerContextMemory | null;
}): ActionRecommendation => {
  const purchase = input.tireEvidence.currentTireInstallation;
  const recentRotations = input.tireEvidence.rotationEvents.slice(-3);
  const lastRotation = recentRotations.at(-1) ?? null;
  const providerName = lastRotation?.shop ?? purchase?.shop ?? null;
  const providerLocation =
    lastRotation?.shopLocation ??
    purchase?.shopLocation ??
    (providerName
      ? input.ownerContextMemory?.shopLocations?.[normalizeProvider(providerName)]
      : undefined) ??
    null;
  const normalizedProvider = providerName ? normalizeProvider(providerName) : "";
  const providerMatches = recentRotations.filter(
    (entry) => normalizeProvider(entry.shop) === normalizedProvider,
  );
  const purchaseMatchesProvider =
    Boolean(purchase && providerName) &&
    normalizeProvider(purchase!.shop) === normalizedProvider;
  const observedZeroCost = providerMatches.filter(
    (entry) => parseMoney(entry.total) === 0,
  ).length;
  const isCostco = /costco/i.test(providerName ?? "");
  const confirmedBenefit =
    input.ownerContextMemory?.serviceBenefits?.[TIRE_ROTATION_SERVICE_ID];

  const providerConfidence: QualitativeConfidence =
    providerMatches.length >= 3 && purchaseMatchesProvider
      ? "high"
      : providerMatches.length >= 2
        ? "medium"
        : providerName
          ? "low"
          : "not_scored";

  const observedFreePlan =
    isCostco && purchaseMatchesProvider && observedZeroCost >= 2;
  const expectedZeroCost = Boolean(confirmedBenefit) || observedFreePlan;
  const costConfidence: QualitativeConfidence = confirmedBenefit
    ? "high"
    : observedFreePlan
      ? "medium"
      : "not_scored";

  const priorities = (input.ownerContextMemory?.ownerStatedPriorities ?? [])
    .slice(0, 2)
    .map(formatPriority);
  const whyThisOption: string[] = [];
  if (purchaseMatchesProvider && purchase) {
    whyThisOption.push(
      `The current tire set was installed at ${purchase.shop} on ${purchase.serviceDate}.`,
    );
  }
  if (providerMatches.length > 0) {
    const costPhrase =
      observedZeroCost === providerMatches.length && providerMatches.length > 0
        ? " for $0"
        : "";
    whyThisOption.push(
      `Your last ${providerMatches.length} rotation${providerMatches.length === 1 ? "" : "s"} used this provider${costPhrase}.`,
    );
  }
  if (priorities.length > 0) {
    whyThisOption.push(`Fits your ${priorities.join(" and ")} priorities.`);
  }

  const evidenceIds = [
    ...(purchase?.evidenceIds ?? []),
    ...providerMatches.flatMap((entry) => entry.evidenceIds),
  ];

  if (!providerName) {
    return {
      status: "needs_input",
      method: null,
      providerName: null,
      providerLocation: null,
      expectedTimeLabel: "Provider and time estimate need owner input",
      expectedCost: {
        amount: null,
        currency: "USD",
        label: "Cost not estimated",
        basis: "unknown",
        requiresConfirmation: false,
      },
      whyThisOption: [],
      ownerFit: priorities,
      confidence: {
        provider: "not_scored",
        cost: "not_scored",
        booking: "not_scored",
      },
      nextAction: {
        label: "Choose a provider",
        url: null,
        verifiedAt: null,
      },
      evidenceIds,
      confirmationPrompt: null,
    };
  }

  return {
    status: "active",
    method: isCostco ? "tire_retailer" : "local_shop",
    providerName,
    providerLocation,
    expectedTimeLabel: "Appointment · time estimate not available yet",
    expectedCost: {
      amount: expectedZeroCost ? 0 : null,
      currency: "USD",
      label: expectedZeroCost ? "Expected $0" : "Cost not estimated",
      basis: confirmedBenefit ? "owner_confirmed" : observedFreePlan ? "observed_history" : "unknown",
      requiresConfirmation: observedFreePlan && !confirmedBenefit,
    },
    whyThisOption,
    ownerFit: priorities,
    confidence: {
      provider: providerConfidence,
      cost: costConfidence,
      booking: isCostco ? "medium" : "not_scored",
    },
    nextAction: {
      label: isCostco ? "Open Costco Tire Center" : "Contact provider",
      url: isCostco ? COSTCO_TIRE_URL : null,
      verifiedAt: isCostco ? COSTCO_TIRE_URL_VERIFIED_AT : null,
    },
    evidenceIds: [...new Set(evidenceIds)],
    confirmationPrompt:
      observedFreePlan && !confirmedBenefit
        ? "Confirm that this tire purchase still includes $0 rotations."
        : null,
  };
};

const upcomingIntervalRecommendation = (
  row: ScheduleProjectionRow,
): IntervalRecommendation => ({
  status: "upcoming",
  recommendedMiles: null,
  projectedDueMileage: null,
  recentGapsMiles: [],
  recentAverageMiles: null,
  recentMedianMiles: null,
  evidenceNote: "Item-specific interval intelligence · Phase 2",
  rationale: "The deterministic OEM reminder remains active.",
  confidence: "not_scored",
  activeSource: row.usesOwnerOverlay ? "owner" : "oem",
  activeLabel: row.overlayLabel ?? formatOemInterval(row),
});

const upcomingActionRecommendation = (): ActionRecommendation => ({
  status: "upcoming",
  method: null,
  providerName: null,
  providerLocation: null,
  expectedTimeLabel: "Time-versus-money recommendation · Phase 2",
  expectedCost: {
    amount: null,
    currency: "USD",
    label: "Cost recommendation · upcoming",
    basis: "unknown",
    requiresConfirmation: false,
  },
  whyThisOption: [],
  ownerFit: [],
  confidence: {
    provider: "not_scored",
    cost: "not_scored",
    booking: "not_scored",
  },
  nextAction: {
    label: "In development",
    url: null,
    verifiedAt: null,
  },
  evidenceIds: [],
  confirmationPrompt: null,
});

export const buildMaintenanceItemIntelligence = (
  input: BuildMaintenanceItemIntelligenceInput,
): MaintenanceItemIntelligence => {
  const isTireRotation =
    input.canonicalServiceId === TIRE_ROTATION_SERVICE_ID ||
    /rotate tires|tire rotation/i.test(input.row.serviceName);
  const matches = sortServiceTimeline(
    findMatchingServices(input.timeline, input.row.serviceName, {
      canonicalServiceId: input.canonicalServiceId ?? null,
      serviceAliasRegistry: input.serviceAliasRegistry,
    }),
  );
  const lastMatch = matches.at(-1) ?? null;

  const historySummary =
    matches.length === 0
      ? "No confirmed service record yet"
      : matches.length === 1
        ? `Last confirmed ${lastMatch!.serviceDate} · ${formatMiles(lastMatch!.mileage)}`
        : `${matches.length} confirmed records · last ${lastMatch!.serviceDate} at ${formatMiles(lastMatch!.mileage)}`;

  const priorities = (input.ownerContextMemory?.ownerStatedPriorities ?? [])
    .slice(0, 2)
    .map(formatPriority);
  const ownerUseParts = [
    `${input.effectiveMilesPerYear.toLocaleString("en-US")} mi/year`,
    input.ownerContextMemory?.primaryCity,
    priorities.length > 0 ? priorities.join(" + ") : null,
  ].filter((value): value is string => Boolean(value));

  const overlay = input.ownerContextMemory?.intervalOverlays?.[input.row.entryId];
  const tireConditions = overlay?.tireRotationConditions ?? [];
  const conditionSummary = isTireRotation
    ? tireConditions.length > 0
      ? `Inspect sooner: ${tireConditions.map((condition) => conditionLabels[condition]).join(", ")}`
      : input.ownerContextMemory?.lastTireProduct
        ? `${input.ownerContextMemory.lastTireProduct} · no inspect-sooner signal`
        : "No inspect-sooner signal recorded"
    : "Item-specific condition guidance · Phase 2";

  const axes: MaintenanceRationaleAxis[] = [
    {
      id: "vehicle_oem",
      label: "Vehicle & OEM",
      state: "available",
      summary: `${formatOemInterval(input.row)} · ${input.row.isStubSchedule ? "preview pack" : "verified pack"}`,
    },
    {
      id: "service_history",
      label: "Service history",
      state: matches.length > 0 ? "available" : "missing",
      summary: historySummary,
    },
    {
      id: "owner_use_preferences",
      label: "Owner use & preferences",
      state: ownerUseParts.length > 1 ? "available" : "missing",
      summary: ownerUseParts.join(" · "),
    },
    {
      id: "condition_setup",
      label: "Condition & setup",
      state: isTireRotation ? "available" : "upcoming",
      summary: conditionSummary,
    },
  ];

  if (!isTireRotation) {
    return {
      itemKind: "general",
      whyNow: buildWhyNow(input.row, input.currentMileage),
      reminderConfidence: reminderConfidence(input.row.dueDateConfidence),
      axes,
      intervalRecommendation: upcomingIntervalRecommendation(input.row),
      actionRecommendation: upcomingActionRecommendation(),
    };
  }

  const tireEvidence = resolveTireRotationEvidence({
    timeline: input.timeline,
    rotationMatches: matches,
  });
  const recentGaps = tireEvidence.recentGapsMiles;
  const recentAverageMiles = tireEvidence.recentAverageMiles;
  const recentMedianMiles = tireEvidence.recentMedianMiles;
  const recommendedMiles =
    recentMedianMiles !== null
      ? roundToNearest(recentMedianMiles, 500)
      : input.row.oemInterval.miles;
  const stable = isStable(recentGaps);
  const intervalConfidence: QualitativeConfidence =
    recentGaps.length >= 3 && stable
      ? "high"
      : recentGaps.length >= 2
        ? "medium"
        : "low";
  const usesCurrentTireSet = tireEvidence.scope === "current_tire_set";
  const evidenceNote =
    recentGaps.length === 0
      ? tireEvidence.lifecycleEvents.length === 0
        ? "OEM baseline · no confirmed rotations"
        : tireEvidence.currentTireInstallation && matches.length === 0
          ? "Current tire installation only · no observed rotation gap yet"
          : "Last rotation only · no observed gap yet"
      : recentGaps.length === 1
        ? `${usesCurrentTireSet ? "One current-tire interval" : "One observed gap"} · ${formatMiles(recentGaps[0]!)}`
        : `${recentGaps.length} ${usesCurrentTireSet ? "current-tire intervals" : "recent gaps"} · ${stable ? "consistent" : "variable"}`;
  const rationale =
    recentAverageMiles !== null && recentMedianMiles !== null
      ? `${usesCurrentTireSet ? "Current tire-set" : "Recent"} median ${formatMiles(recentMedianMiles)} · average ${formatMiles(recentAverageMiles)} · OEM ${formatOemInterval(input.row)}`
      : `Using the OEM ${formatOemInterval(input.row)} baseline until more rotation history is recorded`;

  return {
    itemKind: "tire_rotation",
    whyNow: buildWhyNow(input.row, input.currentMileage),
    reminderConfidence: reminderConfidence(input.row.dueDateConfidence),
    axes,
    intervalRecommendation: {
      status: "active",
      recommendedMiles,
      projectedDueMileage:
        recommendedMiles !== null && tireEvidence.lastLifecycleMileage !== null
          ? tireEvidence.lastLifecycleMileage + recommendedMiles
          : null,
      recentGapsMiles: recentGaps,
      recentAverageMiles,
      recentMedianMiles,
      evidenceNote,
      rationale,
      confidence: intervalConfidence,
      activeSource: input.row.usesOwnerOverlay ? "owner" : "oem",
      activeLabel: input.row.overlayLabel ?? formatOemInterval(input.row),
    },
    actionRecommendation: buildActionRecommendation({
      tireEvidence,
      ownerContextMemory: input.ownerContextMemory,
    }),
  };
};
