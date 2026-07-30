import type { ServiceTimelineEntry } from "../projections/types.js";

export type TireRotationEvidenceScope = "current_tire_set" | "vehicle_history";

export type TireRotationEvidence = {
  currentTireInstallation: ServiceTimelineEntry | null;
  rotationEvents: ServiceTimelineEntry[];
  lifecycleEvents: ServiceTimelineEntry[];
  recentGapsMiles: number[];
  recentAverageMiles: number | null;
  recentMedianMiles: number | null;
  lastLifecycleMileage: number | null;
  scope: TireRotationEvidenceScope;
};

const TIRE_INSTALLATION_PATTERN =
  /(?:four|4|all)\s+tires?\s+(?:replaced|installed|purchased)|tires?\s+(?:replaced|installed|purchased)/i;

export const sortServiceTimeline = (
  entries: ServiceTimelineEntry[],
): ServiceTimelineEntry[] =>
  [...entries].sort((left, right) => {
    const dateDelta = left.serviceDate.localeCompare(right.serviceDate);
    if (dateDelta !== 0) return dateDelta;
    return left.mileage - right.mileage;
  });

const isAtOrAfter = (
  entry: ServiceTimelineEntry,
  baseline: ServiceTimelineEntry,
): boolean =>
  entry.serviceDate > baseline.serviceDate ||
  (entry.serviceDate === baseline.serviceDate && entry.mileage >= baseline.mileage);

const mileageGaps = (entries: ServiceTimelineEntry[]): number[] => {
  const gaps: number[] = [];
  for (let index = 1; index < entries.length; index += 1) {
    const gap = entries[index]!.mileage - entries[index - 1]!.mileage;
    if (gap > 0) gaps.push(gap);
  }
  return gaps;
};

const average = (values: number[]): number | null =>
  values.length > 0
    ? Math.round(values.reduce((total, value) => total + value, 0) / values.length)
    : null;

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1]! + sorted[middle]!) / 2);
  }
  return sorted[middle]!;
};

export const findLatestTireInstallation = (
  timeline: ServiceTimelineEntry[],
): ServiceTimelineEntry | null =>
  sortServiceTimeline(
    timeline.filter((entry) =>
      entry.lineItems.some((lineItem) => TIRE_INSTALLATION_PATTERN.test(lineItem)),
    ),
  ).at(-1) ?? null;

export const resolveTireRotationEvidence = (input: {
  timeline: ServiceTimelineEntry[];
  rotationMatches: ServiceTimelineEntry[];
}): TireRotationEvidence => {
  const currentTireInstallation = findLatestTireInstallation(input.timeline);
  const sortedRotations = sortServiceTimeline(input.rotationMatches);
  const rotationEvents = currentTireInstallation
    ? sortedRotations.filter(
        (entry) =>
          entry.serviceId !== currentTireInstallation.serviceId &&
          isAtOrAfter(entry, currentTireInstallation),
      )
    : sortedRotations;
  const lifecycleEvents = currentTireInstallation
    ? sortServiceTimeline([currentTireInstallation, ...rotationEvents])
    : rotationEvents;
  const recentGapsMiles = mileageGaps(lifecycleEvents).slice(-3);

  return {
    currentTireInstallation,
    rotationEvents,
    lifecycleEvents,
    recentGapsMiles,
    recentAverageMiles: average(recentGapsMiles),
    recentMedianMiles: median(recentGapsMiles),
    lastLifecycleMileage: lifecycleEvents.at(-1)?.mileage ?? null,
    scope: currentTireInstallation ? "current_tire_set" : "vehicle_history",
  };
};
