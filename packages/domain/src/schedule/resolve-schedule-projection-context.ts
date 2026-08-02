import type { ServiceTimelineEntry } from "../projections/types.js";
import { maintenanceServiceHistory } from "../service/service-record-kind.js";
import {
  DEFAULT_DUE_SOON_DAYS,
  DEFAULT_EFFECTIVE_MILES_PER_YEAR,
} from "./project-maintenance-schedule.js";

export type DrivingStyle = "economical" | "casual" | "aggressive";

export const AGGRESSIVE_DUE_SOON_DAYS = 45;

export type ScheduleProjectionContext = {
  ownedSince: string | null;
  drivingStyle: DrivingStyle | null;
  statedMilesPerYear: number | null;
  observedMilesPerYear: number | null;
  effectiveMilesPerYear: number;
  dueSoonDays: number;
};

const MIN_OBSERVATION_DAYS = 90;
const RECENT_WINDOW_DAYS = 730;

const parseIsoDate = (value: string): Date => new Date(`${value}T12:00:00.000Z`);

const formatIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

const daysBetween = (from: string, to: string): number => {
  const start = parseIsoDate(from).getTime();
  const end = parseIsoDate(to).getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
};

export const resolveDueSoonDays = (drivingStyle: DrivingStyle | null): number => {
  if (drivingStyle === "aggressive") return AGGRESSIVE_DUE_SOON_DAYS;
  return DEFAULT_DUE_SOON_DAYS;
};

export const computeEffectiveMilesPerYear = (input: {
  statedMilesPerYear: number | null;
  observedMilesPerYear: number | null;
}): number => {
  if (input.observedMilesPerYear !== null) {
    const stated = input.statedMilesPerYear ?? DEFAULT_EFFECTIVE_MILES_PER_YEAR;
    return Math.round(0.7 * input.observedMilesPerYear + 0.3 * stated);
  }

  return input.statedMilesPerYear ?? DEFAULT_EFFECTIVE_MILES_PER_YEAR;
};

export const computeObservedMilesPerYear = (
  timeline: ServiceTimelineEntry[],
  today: string = formatIsoDate(new Date()),
): number | null => {
  const points = timeline
    .filter((entry) => entry.mileage > 0 && entry.serviceDate)
    .sort((left, right) => left.serviceDate.localeCompare(right.serviceDate));

  if (points.length < 2) return null;

  let bestRate: number | null = null;
  let bestLaterDate: string | null = null;

  for (let earlierIndex = 0; earlierIndex < points.length; earlierIndex += 1) {
    for (let laterIndex = earlierIndex + 1; laterIndex < points.length; laterIndex += 1) {
      const earlier = points[earlierIndex];
      const later = points[laterIndex];
      const daysDelta = daysBetween(earlier.serviceDate, later.serviceDate);
      if (daysDelta < MIN_OBSERVATION_DAYS) continue;
      if (daysBetween(later.serviceDate, today) > RECENT_WINDOW_DAYS) continue;

      const mileageDelta = later.mileage - earlier.mileage;
      if (mileageDelta <= 0) continue;

      const rate = Math.round((mileageDelta / daysDelta) * 365);
      if (!bestLaterDate || later.serviceDate > bestLaterDate) {
        bestLaterDate = later.serviceDate;
        bestRate = rate;
      }
    }
  }

  return bestRate;
};

export const resolveScheduleProjectionContext = (input: {
  ownedSince?: string | null;
  drivingStyle?: DrivingStyle | null;
  statedMilesPerYear?: number | null;
  timeline: ServiceTimelineEntry[];
  today?: string;
}): ScheduleProjectionContext => {
  const today = input.today ?? formatIsoDate(new Date());
  const statedMilesPerYear = input.statedMilesPerYear ?? null;
  const drivingStyle = input.drivingStyle ?? null;
  const observedMilesPerYear = computeObservedMilesPerYear(maintenanceServiceHistory(input.timeline), today);

  return {
    ownedSince: input.ownedSince ?? null,
    drivingStyle,
    statedMilesPerYear,
    observedMilesPerYear,
    effectiveMilesPerYear: computeEffectiveMilesPerYear({
      statedMilesPerYear,
      observedMilesPerYear,
    }),
    dueSoonDays: resolveDueSoonDays(drivingStyle),
  };
};
