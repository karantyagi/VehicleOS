import { findLastMatchingService, findMatchingServices } from "../knowledge/match-service-name.js";
import type { ServiceAliasRegistry } from "../knowledge/service-alias-registry.js";
import { resolveIntervalForEntry } from "../owner-context/merge-interval-overlay-memory.js";
import type { OwnerContextMemory } from "../owner-context/types.js";
import { computeOemServiceTiming, type OemServiceTiming } from "./compute-oem-service-timing.js";
import type { KnowledgeScheduleEntry, ServiceTimelineEntry } from "../projections/types.js";

export type ScheduleProjectionStatus = "overdue" | "due_soon" | "upcoming" | "needs_baseline";

export type ScheduleProjectionRow = {
  entryId: string;
  serviceName: string;
  systemGroup: string;
  dueDate: string | null;
  dueMileage: number | null;
  status: ScheduleProjectionStatus;
  serviceBaseline: {
    performedDate: string | null;
    performedMileage: number | null;
    baselineSource: "receipt" | "carfax" | "owned_since" | "unknown";
  };
  oemInterval: { months: number | null; miles: number | null };
  oemSource: { manualTitle: string; page: string | null; ruleId: string };
  dueDateConfidence: "oem_calendar" | "mileage_converted" | "needs_baseline";
  isStubSchedule: boolean;
  /** Deterministic timing of last performed service vs OEM interval (V1.1). */
  oemTiming: OemServiceTiming | null;
  /** True when overdue with no history match — owner may have skipped or deferred. */
  overdueWithoutHistory: boolean;
  /** True when owner-verified interval overlay replaced OEM interval for projection. */
  usesOwnerOverlay?: boolean;
  overlayLabel?: string | null;
};

export type ScheduleHorizonMode = "near" | "extended" | "full" | "complete";

/** Minimum OEM rows for a non-stub owner schedule (full Maintenance Minder pack). */
export const VERIFIED_PACK_MIN_ENTRIES = 8;

export type ProjectMaintenanceScheduleInput = {
  knowledgeSchedule: KnowledgeScheduleEntry[];
  timeline: ServiceTimelineEntry[];
  currentMileage: number;
  effectiveMilesPerYear?: number;
  ownedSince?: string | null;
  today?: string;
  /** Explicit month window from today — ignored when `horizonMode` is set. */
  horizonMonths?: number;
  /** Preferred horizon selector — near (3 mo), extended (12 mo), or full OEM life cap. */
  horizonMode?: ScheduleHorizonMode;
  dueSoonDays?: number;
  ownerContextMemory?: OwnerContextMemory | null;
  serviceAliasRegistry?: ServiceAliasRegistry | null;
};

export type ProjectMaintenanceScheduleResult = {
  rows: ScheduleProjectionRow[];
  effectiveMilesPerYear: number;
  horizonMonths: number;
  horizonMode: ScheduleHorizonMode;
  horizonEnd: string;
};

export const DEFAULT_EFFECTIVE_MILES_PER_YEAR = 10_000;
export const DEFAULT_SCHEDULE_HORIZON_MONTHS = 3;
export const EXTENDED_SCHEDULE_HORIZON_MONTHS = 12;
export const FULL_OEM_LIFE_CAP_YEARS = 5;
export const DEFAULT_DUE_SOON_DAYS = 30;

const parseIsoDate = (value: string): Date => new Date(`${value}T12:00:00.000Z`);

const formatIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

const addMonths = (date: string, months: number): string => {
  const next = parseIsoDate(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return formatIsoDate(next);
};

const addDays = (date: string, days: number): string => {
  const next = parseIsoDate(date);
  next.setUTCDate(next.getUTCDate() + days);
  return formatIsoDate(next);
};

const addYears = (date: string, years: number): string => {
  const next = parseIsoDate(date);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return formatIsoDate(next);
};

export const resolveScheduleHorizonEnd = (input: {
  today: string;
  ownedSince?: string | null;
  horizonMode?: ScheduleHorizonMode;
  horizonMonths?: number;
}): { horizonMode: ScheduleHorizonMode; horizonMonths: number; horizonEnd: string } => {
  const horizonMode = input.horizonMode ?? "near";
  if (horizonMode === "complete") {
    return {
      horizonMode,
      horizonMonths: FULL_OEM_LIFE_CAP_YEARS * 12,
      horizonEnd: addYears(input.today, FULL_OEM_LIFE_CAP_YEARS),
    };
  }

  if (horizonMode === "full") {
    const ownedAnchor = input.ownedSince ?? input.today;
    const forwardEnd = addYears(input.today, FULL_OEM_LIFE_CAP_YEARS);
    const ownedEnd = addYears(ownedAnchor, FULL_OEM_LIFE_CAP_YEARS);
    const horizonEnd = forwardEnd > ownedEnd ? forwardEnd : ownedEnd;
    return {
      horizonMode,
      horizonMonths: FULL_OEM_LIFE_CAP_YEARS * 12,
      horizonEnd,
    };
  }

  const horizonMonths =
    horizonMode === "extended"
      ? EXTENDED_SCHEDULE_HORIZON_MONTHS
      : (input.horizonMonths ?? DEFAULT_SCHEDULE_HORIZON_MONTHS);

  return {
    horizonMode,
    horizonMonths,
    horizonEnd: addMonths(input.today, horizonMonths),
  };
};

const resolveBaselineSource = (input: {
  lastMatch: ServiceTimelineEntry | undefined;
  ownedSince: string | null;
}): ScheduleProjectionRow["serviceBaseline"]["baselineSource"] => {
  if (input.lastMatch) {
    if (input.lastMatch.source === "carfax_import") return "carfax";
    return "receipt";
  }
  if (input.ownedSince) return "owned_since";
  return "unknown";
};

const daysBetween = (from: string, to: string): number => {
  const start = parseIsoDate(from).getTime();
  const end = parseIsoDate(to).getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
};

const inferSystemGroup = (serviceName: string): string => {
  const normalized = serviceName.toLowerCase();
  if (/oil|spark|belt|engine/.test(normalized)) return "Engine";
  if (/brake/.test(normalized)) return "Brakes";
  if (/fluid|coolant|transmission/.test(normalized)) return "Fluids";
  if (/filter/.test(normalized)) return "Filters";
  if (/tire/.test(normalized)) return "Tires";
  return "Other";
};

const resolveStatus = (input: {
  today: string;
  dueDate: string | null;
  dueMileage: number | null;
  currentMileage: number;
  dueSoonDays: number;
  needsBaseline: boolean;
}): ScheduleProjectionStatus => {
  if (input.needsBaseline) return "needs_baseline";

  const overdueByDate = input.dueDate ? input.today > input.dueDate : false;
  const overdueByMileage =
    input.dueMileage !== null && input.currentMileage >= input.dueMileage;

  if (overdueByDate || overdueByMileage) return "overdue";

  if (input.dueDate && daysBetween(input.today, input.dueDate) <= input.dueSoonDays) {
    return "due_soon";
  }

  return "upcoming";
};

const buildRow = (input: {
  entry: KnowledgeScheduleEntry;
  timeline: ServiceTimelineEntry[];
  currentMileage: number;
  effectiveMilesPerYear: number;
  ownedSince: string | null;
  today: string;
  dueSoonDays: number;
  ownerContextMemory?: OwnerContextMemory | null;
  serviceAliasRegistry?: ServiceAliasRegistry | null;
  isVerifiedPack: boolean;
}): ScheduleProjectionRow => {
  const matchOptions = {
    canonicalServiceId: input.entry.canonicalServiceId ?? null,
    serviceAliasRegistry: input.serviceAliasRegistry,
  };
  const lastMatch = findLastMatchingService(input.timeline, input.entry.serviceName, matchOptions);
  const allMatches = findMatchingServices(input.timeline, input.entry.serviceName, matchOptions);
  const performedDate = lastMatch?.serviceDate ?? null;
  const performedMileage = lastMatch?.mileage ?? null;
  const baselineSource = resolveBaselineSource({
    lastMatch,
    ownedSince: input.ownedSince,
  });

  const hasTimelineHistory = input.timeline.length > 0;
  const baselineDate = performedDate ?? (hasTimelineHistory ? input.ownedSince : null) ?? null;
  const baselineMileage = performedMileage ?? 0;
  const resolvedInterval = resolveIntervalForEntry({
    entryId: input.entry.entryId,
    oemIntervalMonths: input.entry.intervalMonths ?? null,
    oemIntervalMiles: input.entry.intervalMiles ?? null,
    ownerContextMemory: input.ownerContextMemory,
  });
  const intervalMonths = resolvedInterval.intervalMonths;
  const intervalMiles = resolvedInterval.intervalMiles;
  const dueMileage = intervalMiles !== null ? baselineMileage + intervalMiles : null;

  let dueDate: string | null = null;
  let dueDateConfidence: ScheduleProjectionRow["dueDateConfidence"] = "needs_baseline";
  let needsBaseline = false;

  if (!lastMatch && !hasTimelineHistory) {
    needsBaseline = true;
  } else if (intervalMonths !== null && baselineDate) {
    dueDate = addMonths(baselineDate, intervalMonths);
    dueDateConfidence = "oem_calendar";
  } else if (intervalMonths !== null && !baselineDate) {
    needsBaseline = true;
  } else if (intervalMiles !== null && baselineDate) {
    const milesRemaining = baselineMileage + intervalMiles - input.currentMileage;
    const daysUntil = (milesRemaining / input.effectiveMilesPerYear) * 365;
    dueDate = addDays(input.today, Math.round(daysUntil));
    dueDateConfidence = "mileage_converted";
  } else if (intervalMiles !== null && !baselineDate) {
    needsBaseline = true;
  }

  const status = resolveStatus({
    today: input.today,
    dueDate,
    dueMileage,
    currentMileage: input.currentMileage,
    dueSoonDays: input.dueSoonDays,
    needsBaseline,
  });

  const oemTiming =
    lastMatch && intervalMonths
      ? computeOemServiceTiming({
          matches: allMatches,
          intervalMonths,
          ownedSince: input.ownedSince,
        })
      : null;

  const overdueWithoutHistory =
    status === "overdue" && !lastMatch && baselineSource === "owned_since";

  return {
    entryId: input.entry.entryId,
    serviceName: input.entry.serviceName,
    systemGroup: inferSystemGroup(input.entry.serviceName),
    dueDate,
    dueMileage,
    status,
    serviceBaseline: {
      performedDate,
      performedMileage,
      baselineSource,
    },
    oemInterval: {
      months: input.entry.intervalMonths ?? null,
      miles: input.entry.intervalMiles ?? null,
    },
    oemSource: {
      manualTitle: input.entry.manualTitle,
      page: input.entry.sourcePage ?? null,
      ruleId: `knowledge.policy.${input.entry.entryId}.v1`,
    },
    dueDateConfidence,
    isStubSchedule: !input.isVerifiedPack,
    oemTiming,
    overdueWithoutHistory,
    usesOwnerOverlay: resolvedInterval.usesOwnerOverlay,
    overlayLabel: resolvedInterval.overlayLabel ?? null,
  };
};

const isWithinHorizon = (input: {
  row: ScheduleProjectionRow;
  today: string;
  horizonEnd: string;
  horizonMode: ScheduleHorizonMode;
}): boolean => {
  if (input.horizonMode === "complete") return true;
  if (input.row.status === "overdue" || input.row.status === "needs_baseline") return true;
  if (!input.row.dueDate) return input.row.status !== "upcoming";
  return input.row.dueDate <= input.horizonEnd;
};

const sortRows = (rows: ScheduleProjectionRow[]): ScheduleProjectionRow[] => {
  const statusRank: Record<ScheduleProjectionStatus, number> = {
    overdue: 0,
    due_soon: 1,
    upcoming: 2,
    needs_baseline: 3,
  };

  return [...rows].sort((left, right) => {
    const rankDelta = statusRank[left.status] - statusRank[right.status];
    if (rankDelta !== 0) return rankDelta;
    if (left.dueDate && right.dueDate) return left.dueDate.localeCompare(right.dueDate);
    if (left.dueDate) return -1;
    if (right.dueDate) return 1;
    return left.serviceName.localeCompare(right.serviceName);
  });
};

export const projectMaintenanceSchedule = (
  input: ProjectMaintenanceScheduleInput,
): ProjectMaintenanceScheduleResult => {
  const effectiveMilesPerYear = input.effectiveMilesPerYear ?? DEFAULT_EFFECTIVE_MILES_PER_YEAR;
  const today = input.today ?? formatIsoDate(new Date());
  const dueSoonDays = input.dueSoonDays ?? DEFAULT_DUE_SOON_DAYS;
  const ownedSince = input.ownedSince ?? null;
  const { horizonMode, horizonMonths, horizonEnd } = resolveScheduleHorizonEnd({
    today,
    ownedSince,
    horizonMode: input.horizonMode,
    horizonMonths: input.horizonMonths,
  });

  const isVerifiedPack = input.knowledgeSchedule.length >= VERIFIED_PACK_MIN_ENTRIES;

  const rows = input.knowledgeSchedule
    .map((entry) =>
      buildRow({
        entry,
        timeline: input.timeline,
        currentMileage: input.currentMileage,
        effectiveMilesPerYear,
        ownedSince,
        today,
        dueSoonDays,
        ownerContextMemory: input.ownerContextMemory,
        serviceAliasRegistry: input.serviceAliasRegistry,
        isVerifiedPack,
      }),
    )
    .filter((row) => isWithinHorizon({ row, today, horizonEnd, horizonMode }));

  return {
    rows: sortRows(rows),
    effectiveMilesPerYear,
    horizonMonths,
    horizonMode,
    horizonEnd,
  };
};
