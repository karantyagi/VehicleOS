const parseIsoDate = (value: string): Date => new Date(`${value}T12:00:00.000Z`);

export const formatIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

export const addDays = (date: string, days: number): string => {
  const next = parseIsoDate(date);
  next.setUTCDate(next.getUTCDate() + days);
  return formatIsoDate(next);
};

const daysBetween = (from: string, to: string): number => {
  const start = parseIsoDate(from).getTime();
  const end = parseIsoDate(to).getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
};

const formatFriendlyDate = (isoDate: string): string => {
  const date = parseIsoDate(isoDate);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

export type ReminderUrgency = "overdue" | "due_now" | "due_soon" | "upcoming" | "snoozed";
export type AttentionWindow = "overdue" | "this_week" | "next_week" | "this_month" | "later";

export const resolveAttentionWindow = (
  dueBy: string | null,
  today: string,
): AttentionWindow => {
  if (!dueBy) return "this_month";

  const days = daysBetween(today, dueBy);
  if (days < 0) return "overdue";
  if (days <= 7) return "this_week";
  if (days <= 14) return "next_week";
  if (days <= 30) return "this_month";
  return "later";
};

export const resolveReminderUrgency = (input: {
  dueBy: string | null;
  today: string;
  status: string;
  snoozeUntil?: string | null;
}): ReminderUrgency => {
  if (!input.dueBy) return "upcoming";

  const days = daysBetween(input.today, input.dueBy);
  if (days < 0) return "overdue";
  if (days <= 1) return "due_now";
  if (days <= 14) return "due_soon";
  return "upcoming";
};

/** Owner-facing deadline — never leads with mileage. */
export const formatOwnerDeadline = (dueBy: string | null, today: string): string => {
  if (!dueBy) return "Schedule when you can this month";

  const days = daysBetween(today, dueBy);
  if (days < 0) return "Overdue — act now";
  if (days === 0) return "Due today";
  if (days <= 7) return "By end of this week";
  if (days <= 14) return "Within the next two weeks";
  if (days <= 30) return "Within the next month";
  return `By ${formatFriendlyDate(dueBy)}`;
};

export const formatSnoozeEscalation = (snoozeCount: number): string | null => {
  if (snoozeCount >= 3) {
    return "You've snoozed this several times — overdue risk is rising. Schedule soon.";
  }
  if (snoozeCount >= 2) {
    return "You snoozed this twice — get it done now to avoid extra wear or cost.";
  }
  if (snoozeCount === 1) {
    return "You snoozed this once — still on your list when you're ready.";
  }
  return null;
};
