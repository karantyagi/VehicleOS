import { resolveIntervalForEntry } from "../owner-context/merge-interval-overlay-memory.js";
import type { OwnerContextMemory } from "../owner-context/types.js";
import type { ServiceTimelineEntry } from "../projections/types.js";
import {
  DEFAULT_DUE_SOON_DAYS,
  DEFAULT_EFFECTIVE_MILES_PER_YEAR,
  type ScheduleProjectionRow,
  type ScheduleProjectionStatus,
} from "./project-maintenance-schedule.js";
import { OWNER_HABIT_DEFINITIONS, isOwnerHabitEntryId } from "./owner-habit-definitions.js";

const parseIsoDate = (value: string): Date => new Date(`${value}T12:00:00.000Z`);

const formatIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

const addDays = (date: string, days: number): string => {
  const next = parseIsoDate(date);
  next.setUTCDate(next.getUTCDate() + days);
  return formatIsoDate(next);
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
  if (input.dueMileage !== null && input.currentMileage >= input.dueMileage) return "overdue";
  if (input.dueDate && input.dueDate < input.today) return "overdue";
  if (input.dueMileage !== null && input.currentMileage >= input.dueMileage - 500) return "due_soon";
  if (input.dueDate) {
    const dueSoonCutoff = addDays(input.today, input.dueSoonDays);
    if (input.dueDate <= dueSoonCutoff) return "due_soon";
  }
  return "upcoming";
};

const findHabitMatches = (
  timeline: ServiceTimelineEntry[],
  lineItemPattern: RegExp,
): { serviceDate: string; mileage: number }[] => {
  const matches: { serviceDate: string; mileage: number }[] = [];

  for (const entry of timeline) {
    if (!entry.lineItems.some((line) => lineItemPattern.test(line))) continue;
    matches.push({ serviceDate: entry.serviceDate, mileage: entry.mileage });
  }

  return matches.sort((left, right) => left.serviceDate.localeCompare(right.serviceDate));
};

export const projectOwnerHabitScheduleRows = (input: {
  timeline: ServiceTimelineEntry[];
  currentMileage: number;
  ownerContextMemory?: OwnerContextMemory | null;
  effectiveMilesPerYear?: number;
  today?: string;
  dueSoonDays?: number;
}): ScheduleProjectionRow[] => {
  const overlays = input.ownerContextMemory?.intervalOverlays ?? {};
  const today = input.today ?? formatIsoDate(new Date());
  const effectiveMilesPerYear = input.effectiveMilesPerYear ?? DEFAULT_EFFECTIVE_MILES_PER_YEAR;
  const dueSoonDays = input.dueSoonDays ?? DEFAULT_DUE_SOON_DAYS;

  const rows: ScheduleProjectionRow[] = [];

  for (const [entryId, overlay] of Object.entries(overlays)) {
    if (!isOwnerHabitEntryId(entryId)) continue;

    const habit = OWNER_HABIT_DEFINITIONS.find((definition) => definition.entryId === entryId);
    if (!habit) continue;

    const matches = findHabitMatches(input.timeline, habit.lineItemPattern);
    const lastMatch = matches.at(-1);
    const resolvedInterval = resolveIntervalForEntry({
      entryId,
      oemIntervalMonths: null,
      oemIntervalMiles: null,
      ownerContextMemory: input.ownerContextMemory,
    });

    const intervalMiles = resolvedInterval.intervalMiles;
    const baselineMileage = lastMatch?.mileage ?? 0;
    const dueMileage = intervalMiles !== null ? baselineMileage + intervalMiles : null;

    let dueDate: string | null = null;
    if (dueMileage !== null) {
      const milesRemaining = dueMileage - input.currentMileage;
      const daysUntil = (milesRemaining / effectiveMilesPerYear) * 365;
      dueDate = addDays(today, Math.round(daysUntil));
    }

    const needsBaseline = !lastMatch;
    const status = resolveStatus({
      today,
      dueDate,
      dueMileage,
      currentMileage: input.currentMileage,
      dueSoonDays,
      needsBaseline,
    });

    rows.push({
      entryId,
      serviceName: habit.serviceName,
      systemGroup: "Fluids",
      dueDate,
      dueMileage,
      status,
      serviceBaseline: {
        performedDate: lastMatch?.serviceDate ?? null,
        performedMileage: lastMatch?.mileage ?? null,
        baselineSource: lastMatch ? "receipt" : "unknown",
      },
      oemInterval: { months: null, miles: null },
      oemSource: {
        manualTitle: "Owner habit",
        page: null,
        ruleId: `owner-habit.policy.${entryId}.v1`,
      },
      dueDateConfidence: dueDate ? "mileage_converted" : "needs_baseline",
      isStubSchedule: false,
      oemTiming: null,
      overdueWithoutHistory: status === "overdue" && !lastMatch,
      usesOwnerOverlay: true,
      overlayLabel: overlay.label,
    });
  }

  return rows;
};
