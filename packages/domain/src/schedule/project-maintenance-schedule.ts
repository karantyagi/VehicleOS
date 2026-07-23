import { findLastMatchingService } from "../knowledge/match-service-name.js";
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
    baselineSource: "receipt" | "owned_since" | "unknown";
  };
  oemInterval: { months: number | null; miles: number | null };
  oemSource: { manualTitle: string; page: string | null; ruleId: string };
  dueDateConfidence: "oem_calendar" | "mileage_converted" | "needs_baseline";
  isStubSchedule: boolean;
};

export type ProjectMaintenanceScheduleInput = {
  knowledgeSchedule: KnowledgeScheduleEntry[];
  timeline: ServiceTimelineEntry[];
  currentMileage: number;
  effectiveMilesPerYear?: number;
  ownedSince?: string | null;
  today?: string;
  horizonMonths?: number;
  dueSoonDays?: number;
};

export type ProjectMaintenanceScheduleResult = {
  rows: ScheduleProjectionRow[];
  effectiveMilesPerYear: number;
  horizonMonths: number;
};

export const DEFAULT_EFFECTIVE_MILES_PER_YEAR = 10_000;
export const DEFAULT_SCHEDULE_HORIZON_MONTHS = 3;
export const EXTENDED_SCHEDULE_HORIZON_MONTHS = 12;
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
}): ScheduleProjectionRow => {
  const lastMatch = findLastMatchingService(input.timeline, input.entry.serviceName);
  const performedDate = lastMatch?.serviceDate ?? null;
  const performedMileage = lastMatch?.mileage ?? null;
  const baselineSource: ScheduleProjectionRow["serviceBaseline"]["baselineSource"] = lastMatch
    ? "receipt"
    : input.ownedSince
      ? "owned_since"
      : "unknown";

  const baselineDate = performedDate ?? input.ownedSince ?? null;
  const baselineMileage = performedMileage ?? 0;
  const intervalMonths = input.entry.intervalMonths ?? null;
  const intervalMiles = input.entry.intervalMiles ?? null;
  const dueMileage = intervalMiles !== null ? baselineMileage + intervalMiles : null;

  let dueDate: string | null = null;
  let dueDateConfidence: ScheduleProjectionRow["dueDateConfidence"] = "needs_baseline";
  let needsBaseline = false;

  if (intervalMonths !== null && baselineDate) {
    dueDate = addMonths(baselineDate, intervalMonths);
    dueDateConfidence = "oem_calendar";
  } else if (intervalMonths !== null) {
    needsBaseline = true;
  } else if (intervalMiles !== null) {
    const milesRemaining = baselineMileage + intervalMiles - input.currentMileage;
    const daysUntil = (milesRemaining / input.effectiveMilesPerYear) * 365;
    dueDate = addDays(input.today, Math.round(daysUntil));
    dueDateConfidence = "mileage_converted";
  }

  const status = resolveStatus({
    today: input.today,
    dueDate,
    dueMileage,
    currentMileage: input.currentMileage,
    dueSoonDays: input.dueSoonDays,
    needsBaseline,
  });

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
      months: intervalMonths,
      miles: intervalMiles,
    },
    oemSource: {
      manualTitle: input.entry.manualTitle,
      page: input.entry.sourcePage ?? null,
      ruleId: `knowledge.policy.${input.entry.entryId}.v1`,
    },
    dueDateConfidence,
    isStubSchedule: true,
  };
};

const isWithinHorizon = (input: {
  row: ScheduleProjectionRow;
  today: string;
  horizonEnd: string;
}): boolean => {
  if (input.row.status === "overdue" || input.row.status === "needs_baseline") return true;
  if (!input.row.dueDate) return false;
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
  const horizonMonths = input.horizonMonths ?? DEFAULT_SCHEDULE_HORIZON_MONTHS;
  const dueSoonDays = input.dueSoonDays ?? DEFAULT_DUE_SOON_DAYS;
  const horizonEnd = addMonths(today, horizonMonths);
  const ownedSince = input.ownedSince ?? null;

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
      }),
    )
    .filter((row) => isWithinHorizon({ row, today, horizonEnd }));

  return {
    rows: sortRows(rows),
    effectiveMilesPerYear,
    horizonMonths,
  };
};
