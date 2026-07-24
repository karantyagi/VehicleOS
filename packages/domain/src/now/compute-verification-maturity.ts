import { EVENT_TYPES, type CatalogDomainEvent } from "../events/catalog.js";

export type VerificationWeeklyBucket = {
  weekStart: string;
  count: number;
};

export type AssistantMaturityStage = "onboarding" | "learning" | "steady";

export type VerificationMaturityView = {
  thisWeekCount: number;
  lastWeekCount: number;
  weekOverWeekDelta: number;
  weeklyCounts: VerificationWeeklyBucket[];
  expectedCurve: VerificationWeeklyBucket[];
  maturityStage: AssistantMaturityStage;
  hasEnoughRealData: boolean;
  trendMessage: string;
  celebrateTrend: boolean;
};

export type ComputeVerificationMaturityInput = {
  vehicleId: string;
  events: CatalogDomainEvent[];
  today?: string;
  windowWeeks?: number;
};

const VERIFICATION_MATURITY_WINDOW_WEEKS = 12;

const parseIsoDate = (value: string): Date => new Date(`${value}T12:00:00.000Z`);

const formatIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

const startOfWeek = (isoDate: string): string => {
  const date = parseIsoDate(isoDate);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return formatIsoDate(date);
};

const addWeeks = (isoDate: string, weeks: number): string => {
  const date = parseIsoDate(isoDate);
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return formatIsoDate(date);
};

const weeksBetween = (fromWeekStart: string, toWeekStart: string): number => {
  const start = parseIsoDate(fromWeekStart).getTime();
  const end = parseIsoDate(toWeekStart).getTime();
  return Math.round((end - start) / (7 * 24 * 60 * 60 * 1000));
};

const expectedVerificationCount = (weeksSinceFirst: number): number => {
  if (weeksSinceFirst <= 0) return 12;
  if (weeksSinceFirst === 1) return 10;
  if (weeksSinceFirst === 2) return 7;
  if (weeksSinceFirst === 3) return 4;
  return 2;
};

const rollingAverage = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const computeVerificationMaturity = (
  input: ComputeVerificationMaturityInput,
): VerificationMaturityView => {
  const today = input.today ?? formatIsoDate(new Date());
  const windowWeeks = input.windowWeeks ?? VERIFICATION_MATURITY_WINDOW_WEEKS;
  const currentWeekStart = startOfWeek(today);

  const verificationCreatedEvents = input.events.filter(
    (event) =>
      event.eventType === EVENT_TYPES.TASK_CREATED &&
      event.payload.vehicleId === input.vehicleId &&
      event.payload.taskKind === "verification",
  );

  const countsByWeek = new Map<string, number>();
  for (const event of verificationCreatedEvents) {
    const weekStart = startOfWeek(event.createdAt.slice(0, 10));
    countsByWeek.set(weekStart, (countsByWeek.get(weekStart) ?? 0) + 1);
  }

  const weeklyCounts: VerificationWeeklyBucket[] = [];
  for (let offset = windowWeeks - 1; offset >= 0; offset -= 1) {
    const weekStart = addWeeks(currentWeekStart, -offset);
    weeklyCounts.push({
      weekStart,
      count: countsByWeek.get(weekStart) ?? 0,
    });
  }

  const firstVerificationWeekStart =
    verificationCreatedEvents.length > 0
      ? startOfWeek(
          verificationCreatedEvents
            .map((event) => event.createdAt)
            .sort()[0]!
            .slice(0, 10),
        )
      : currentWeekStart;

  const expectedCurve = weeklyCounts.map((bucket) => ({
    weekStart: bucket.weekStart,
    count: expectedVerificationCount(weeksBetween(firstVerificationWeekStart, bucket.weekStart)),
  }));

  const thisWeekCount = weeklyCounts.at(-1)?.count ?? 0;
  const lastWeekCount = weeklyCounts.at(-2)?.count ?? 0;
  const weekOverWeekDelta = thisWeekCount - lastWeekCount;

  const weeksWithData = weeklyCounts.filter((bucket) => bucket.count > 0).length;
  const hasEnoughRealData = weeksWithData >= 4 || verificationCreatedEvents.length >= 8;

  const recentFour = weeklyCounts.slice(-4).map((bucket) => bucket.count);
  const priorFour = weeklyCounts.slice(-8, -4).map((bucket) => bucket.count);
  const recentAvg = rollingAverage(recentFour);
  const priorAvg = rollingAverage(priorFour);
  const celebrateTrend = hasEnoughRealData && priorFour.length === 4 && recentAvg < priorAvg;

  let maturityStage: AssistantMaturityStage = "learning";
  if (weeksWithData < 2 || thisWeekCount >= 8) {
    maturityStage = "onboarding";
  } else if (hasEnoughRealData && recentAvg <= 2.5) {
    maturityStage = "steady";
  }

  let trendMessage =
    "Your assistant is still learning your car. Verifications are normal now — they should drop as memory builds.";
  if (celebrateTrend) {
    trendMessage = "Verifications are trending down — your assistant memory is stabilizing.";
  } else if (maturityStage === "steady" && thisWeekCount <= 2) {
    trendMessage = "Quiet week — your assistant is doing its job in the background.";
  } else if (weekOverWeekDelta > 0 && hasEnoughRealData) {
    trendMessage = "A few more conflicts than last week — often one-time fixes after new records.";
  } else if (maturityStage === "learning") {
    trendMessage = "Most conflicts are one-time fixes. Verifications should keep dropping as baselines lock in.";
  }

  return {
    thisWeekCount,
    lastWeekCount,
    weekOverWeekDelta,
    weeklyCounts,
    expectedCurve,
    maturityStage,
    hasEnoughRealData,
    trendMessage,
    celebrateTrend,
  };
};
