import type { ServiceTimelineEntry } from "../projections/types.js";

export type OemServiceTiming = "early" | "on_time" | "late" | "unknown";

export const DEFAULT_OEM_TIMING_TOLERANCE_DAYS = 14;

const parseIsoDate = (value: string): Date => new Date(`${value}T12:00:00.000Z`);

const addMonths = (date: string, months: number): string => {
  const next = parseIsoDate(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next.toISOString().slice(0, 10);
};

const daysBetween = (from: string, to: string): number => {
  const start = parseIsoDate(from).getTime();
  const end = parseIsoDate(to).getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
};

export const computeOemServiceTiming = (input: {
  matches: ServiceTimelineEntry[];
  intervalMonths: number | null;
  ownedSince: string | null;
  toleranceDays?: number;
}): OemServiceTiming => {
  const tolerance = input.toleranceDays ?? DEFAULT_OEM_TIMING_TOLERANCE_DAYS;
  if (!input.intervalMonths || input.matches.length === 0) return "unknown";

  const sorted = [...input.matches].sort((left, right) =>
    left.serviceDate.localeCompare(right.serviceDate),
  );
  const lastPerformed = sorted[sorted.length - 1];
  if (!lastPerformed) return "unknown";

  const anchorDate =
    sorted.length >= 2
      ? sorted[sorted.length - 2].serviceDate
      : input.ownedSince;

  if (!anchorDate) return "unknown";

  const expectedDate = addMonths(anchorDate, input.intervalMonths);
  const deltaDays = daysBetween(expectedDate, lastPerformed.serviceDate);

  if (Math.abs(deltaDays) <= tolerance) return "on_time";
  if (deltaDays < 0) return "early";
  return "late";
};
