import type { OwnerContextMemory } from "../owner-context/types.js";
import type { ServiceTimelineEntry } from "../projections/types.js";
import type { IntervalProposal } from "./detect-interval-proposal.js";
import { OWNER_HABIT_DEFINITIONS } from "./owner-habit-definitions.js";

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

type HabitTimelineMatch = {
  serviceDate: string;
  mileage: number;
  lineItem: string;
};

const findHabitMatches = (
  timeline: ServiceTimelineEntry[],
  lineItemPattern: RegExp,
): HabitTimelineMatch[] => {
  const matches: HabitTimelineMatch[] = [];

  for (const entry of timeline) {
    for (const lineItem of entry.lineItems) {
      if (!lineItemPattern.test(lineItem)) continue;
      matches.push({
        serviceDate: entry.serviceDate,
        mileage: entry.mileage,
        lineItem,
      });
      break;
    }
  }

  return matches.sort((left, right) => left.serviceDate.localeCompare(right.serviceDate));
};

const detectOwnerHabitProposal = (input: {
  entryId: string;
  serviceName: string;
  lineItemPattern: RegExp;
  timeline: ServiceTimelineEntry[];
  ownerContextMemory?: OwnerContextMemory | null;
}): IntervalProposal | null => {
  if (input.ownerContextMemory?.intervalOverlays?.[input.entryId]) return null;

  const matches = findHabitMatches(input.timeline, input.lineItemPattern);
  if (matches.length < 2) return null;

  const mileSpacings: number[] = [];
  for (let index = 1; index < matches.length; index += 1) {
    const previous = matches[index - 1]!;
    const current = matches[index]!;
    if (current.mileage > previous.mileage) {
      mileSpacings.push(current.mileage - previous.mileage);
    }
  }

  if (mileSpacings.length === 0) return null;

  const recentSpacings = mileSpacings.slice(-3);
  if (!isStableSpacing(recentSpacings)) return null;

  const observed = Math.round(median(recentSpacings));
  if (observed <= 0) return null;

  return {
    entryId: input.entryId,
    serviceName: input.serviceName,
    intervalKind: "general",
    intervalMiles: observed,
    intervalMonths: null,
    oemIntervalMiles: null,
    oemIntervalMonths: null,
    evidenceSummary: `Last ${matches.length} entries averaged ${observed.toLocaleString("en-US")} mi apart`,
    confidence: recentSpacings.length >= 2 ? 0.85 : 0.7,
    source: "heuristic",
  };
};

export const detectOwnerHabitProposals = (input: {
  timeline: ServiceTimelineEntry[];
  ownerContextMemory?: OwnerContextMemory | null;
}): IntervalProposal[] =>
  OWNER_HABIT_DEFINITIONS.flatMap((habit) => {
    const proposal = detectOwnerHabitProposal({
      entryId: habit.entryId,
      serviceName: habit.serviceName,
      lineItemPattern: habit.lineItemPattern,
      timeline: input.timeline,
      ownerContextMemory: input.ownerContextMemory,
    });
    return proposal ? [proposal] : [];
  });
