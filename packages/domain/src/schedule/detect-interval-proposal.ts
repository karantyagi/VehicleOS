import { findMatchingServices } from "../knowledge/match-service-name.js";
import type { ServiceAliasRegistry } from "../knowledge/service-alias-registry.js";
import type { OwnerContextMemory } from "../owner-context/types.js";
import type { KnowledgeScheduleEntry, ServiceTimelineEntry } from "../projections/types.js";

export type IntervalProposal = {
  entryId: string;
  serviceName: string;
  intervalKind: "general" | "tire_rotation";
  intervalMiles: number | null;
  intervalMonths: number | null;
  oemIntervalMiles: number | null;
  oemIntervalMonths: number | null;
  evidenceSummary: string;
  confidence: number;
  source: "heuristic";
};

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
};

const isStableSpacing = (spacings: number[]): boolean => {
  if (spacings.length === 0) return false;
  if (spacings.length === 1) return spacings[0]! > 0;

  const center = median(spacings);
  if (center <= 0) return false;

  return spacings.every((spacing) => Math.abs(spacing - center) / center <= 0.15);
};

const differsMeaningfullyFromOemMiles = (observed: number, oem: number): boolean =>
  Math.abs(observed - oem) / oem > 0.1;

const differsMeaningfullyFromOemMonths = (observed: number, oem: number): boolean =>
  Math.abs(observed - oem) > 1;

const monthsBetween = (earlier: string, later: string): number => {
  const start = new Date(`${earlier}T12:00:00.000Z`);
  const end = new Date(`${later}T12:00:00.000Z`);
  return (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());
};

const detectMilesProposal = (input: {
  matches: ServiceTimelineEntry[];
  oemIntervalMiles: number;
  serviceLabel?: string;
}): { intervalMiles: number; evidenceSummary: string; confidence: number } | null => {
  const mileSpacings: number[] = [];
  for (let index = 1; index < input.matches.length; index += 1) {
    const previous = input.matches[index - 1]!;
    const current = input.matches[index]!;
    if (current.mileage > previous.mileage) {
      mileSpacings.push(current.mileage - previous.mileage);
    }
  }

  if (mileSpacings.length === 0) return null;

  const recentSpacings = mileSpacings.slice(-3);
  if (recentSpacings.length < 2 || !isStableSpacing(recentSpacings)) return null;

  const observed = Math.round(median(recentSpacings));
  if (observed <= 0 || !differsMeaningfullyFromOemMiles(observed, input.oemIntervalMiles)) {
    return null;
  }

  return {
    intervalMiles: observed,
    evidenceSummary: `Recent ${input.serviceLabel ?? "services"} were typically ${observed.toLocaleString("en-US")} mi apart`,
    confidence: 0.85,
  };
};

const detectMonthsProposal = (input: {
  matches: ServiceTimelineEntry[];
  oemIntervalMonths: number;
}): { intervalMonths: number; evidenceSummary: string; confidence: number } | null => {
  const monthSpacings: number[] = [];
  for (let index = 1; index < input.matches.length; index += 1) {
    const spacing = monthsBetween(input.matches[index - 1]!.serviceDate, input.matches[index]!.serviceDate);
    if (spacing > 0) monthSpacings.push(spacing);
  }

  if (monthSpacings.length === 0) return null;

  const recentSpacings = monthSpacings.slice(-3);
  if (recentSpacings.length < 2 || !isStableSpacing(recentSpacings)) return null;

  const observed = Math.round(median(recentSpacings));
  if (observed <= 0 || !differsMeaningfullyFromOemMonths(observed, input.oemIntervalMonths)) {
    return null;
  }

  return {
    intervalMonths: observed,
    evidenceSummary: `Last ${input.matches.length} services averaged ${observed} mo apart`,
    confidence: 0.85,
  };
};

export const detectIntervalProposalForEntry = (input: {
  entry: KnowledgeScheduleEntry;
  timeline: ServiceTimelineEntry[];
  ownerContextMemory?: OwnerContextMemory | null;
  serviceAliasRegistry?: ServiceAliasRegistry | null;
}): IntervalProposal | null => {
  if (input.ownerContextMemory?.intervalOverlays?.[input.entry.entryId]) return null;

  const oemIntervalMiles = input.entry.intervalMiles ?? null;
  const oemIntervalMonths = input.entry.intervalMonths ?? null;
  const isTireRotation =
    input.entry.canonicalServiceId === "generic.tire_rotation" ||
    /rotate tires|tire rotation/i.test(input.entry.serviceName);
  if (oemIntervalMiles === null && oemIntervalMonths === null) return null;

  const matches = findMatchingServices(input.timeline, input.entry.serviceName, {
    canonicalServiceId: input.entry.canonicalServiceId ?? null,
    serviceAliasRegistry: input.serviceAliasRegistry,
  }).sort((left, right) => left.serviceDate.localeCompare(right.serviceDate));

  // One gap from two services is not enough evidence for an owner habit.
  if (matches.length < 3) return null;

  const milesCandidate =
    oemIntervalMiles !== null
      ? detectMilesProposal({
          matches,
          oemIntervalMiles,
          serviceLabel: isTireRotation ? "rotations" : undefined,
        })
      : null;
  const monthsCandidate =
    !isTireRotation && oemIntervalMonths !== null
      ? detectMonthsProposal({ matches, oemIntervalMonths })
      : null;

  if (!milesCandidate && !monthsCandidate) return null;

  const confidence = Math.max(milesCandidate?.confidence ?? 0, monthsCandidate?.confidence ?? 0);
  const evidenceSummary = [milesCandidate?.evidenceSummary, monthsCandidate?.evidenceSummary]
    .filter(Boolean)
    .join(" · ");

  return {
    entryId: input.entry.entryId,
    serviceName: input.entry.serviceName,
    intervalKind: isTireRotation ? "tire_rotation" : "general",
    intervalMiles: milesCandidate?.intervalMiles ?? null,
    intervalMonths: monthsCandidate?.intervalMonths ?? null,
    oemIntervalMiles,
    oemIntervalMonths,
    evidenceSummary,
    confidence,
    source: "heuristic",
  };
};

export const detectIntervalProposals = (input: {
  knowledgeSchedule: KnowledgeScheduleEntry[];
  timeline: ServiceTimelineEntry[];
  ownerContextMemory?: OwnerContextMemory | null;
  serviceAliasRegistry?: ServiceAliasRegistry | null;
}): IntervalProposal[] =>
  input.knowledgeSchedule.flatMap((entry) => {
    const proposal = detectIntervalProposalForEntry({
      entry,
      timeline: input.timeline,
      ownerContextMemory: input.ownerContextMemory,
      serviceAliasRegistry: input.serviceAliasRegistry,
    });
    return proposal ? [proposal] : [];
  });

export const formatIntervalProposalTaskTitle = (proposal: IntervalProposal): string => {
  if (proposal.intervalMiles !== null) {
    return `${proposal.serviceName} — your ~${proposal.intervalMiles.toLocaleString("en-US")} mi habit?`;
  }
  if (proposal.intervalMonths !== null) {
    return `${proposal.serviceName} — your ~${proposal.intervalMonths} mo habit?`;
  }
  return `${proposal.serviceName} — your maintenance habit?`;
};

export const formatIntervalProposalTaskReason = (proposal: IntervalProposal): string => {
  if (proposal.intervalKind === "tire_rotation") {
    const oemParts: string[] = [];
    if (proposal.oemIntervalMiles !== null) {
      oemParts.push(`${proposal.oemIntervalMiles.toLocaleString("en-US")} mi`);
    }
    if (proposal.oemIntervalMonths !== null) {
      oemParts.push(`${proposal.oemIntervalMonths} mo`);
    }
    const oemReference =
      oemParts.length > 0 ? ` OEM guidance (${oemParts.join(" / ")}) stays on file.` : "";
    return `${proposal.evidenceSummary}. Use miles driven for rotation reminders?${oemReference}`;
  }

  if (proposal.oemIntervalMiles === null && proposal.oemIntervalMonths === null) {
    return `${proposal.evidenceSummary}. Confirm this cadence for reminders?`;
  }

  const oemParts: string[] = [];
  if (proposal.oemIntervalMiles !== null) {
    oemParts.push(`${proposal.oemIntervalMiles.toLocaleString("en-US")} mi`);
  }
  if (proposal.oemIntervalMonths !== null) {
    oemParts.push(`${proposal.oemIntervalMonths} mo`);
  }

  const oemLabel = oemParts.length > 0 ? `OEM ${oemParts.join(" / ")}` : "the OEM interval";
  return `${proposal.evidenceSummary}. Use this instead of ${oemLabel} for reminders? Confirm or keep the OEM interval.`;
};
