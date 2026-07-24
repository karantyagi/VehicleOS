import type { NowQueueItem } from "../projections/types.js";
import type { ScheduleProjectionRow } from "../schedule/project-maintenance-schedule.js";
import {
  formatOwnerDeadline,
  formatSnoozeEscalation,
  resolveReminderUrgency,
  type ReminderUrgency,
} from "./format-owner-deadline.js";
import { matchScheduleRowForRule } from "./prepare-recommendation-task.js";

export type OwnerReminderView = {
  taskId: string;
  title: string;
  reason: string;
  status: NowQueueItem["status"];
  effectiveStatus: "pending" | "snoozed" | "done";
  deadlineLabel: string;
  dueBy: string | null;
  urgency: ReminderUrgency;
  snoozeCount: number;
  snoozeUntil: string | null;
  escalation: string | null;
  ruleId?: string;
};

export const splitOwnerQueues = (items: NowQueueItem[]): {
  reminders: NowQueueItem[];
  verifications: NowQueueItem[];
} => ({
  reminders: items.filter((item) => (item.taskKind ?? "recommendation") !== "verification"),
  verifications: items.filter((item) => item.taskKind === "verification"),
});

export const isActiveReminder = (item: NowQueueItem, today: string): boolean => {
  if (item.taskKind === "verification") return false;
  if (item.status === "pending") return true;
  if (item.status === "snoozed" && item.snoozeUntil && item.snoozeUntil <= today) return true;
  return false;
};

const resolveDueBy = (item: NowQueueItem, scheduleRows: ScheduleProjectionRow[]): string | null => {
  if (item.dueBy) return item.dueBy;
  const row = matchScheduleRowForRule(item.ruleId, scheduleRows);
  return row?.dueDate ?? null;
};

export const buildOwnerReminderView = (input: {
  item: NowQueueItem;
  scheduleRows: ScheduleProjectionRow[];
  today: string;
}): OwnerReminderView => {
  const dueBy = resolveDueBy(input.item, input.scheduleRows);
  const snoozeCount = input.item.snoozeCount ?? 0;
  const snoozeUntil = input.item.snoozeUntil ?? null;
  const urgency = resolveReminderUrgency({
    dueBy,
    today: input.today,
    status: input.item.status,
    snoozeUntil,
  });
  const deadlineLabel = formatOwnerDeadline(dueBy, input.today);
  const escalation = formatSnoozeEscalation(snoozeCount);

  let reason = input.item.reason;
  if (!reason.includes(deadlineLabel)) {
    reason = `${deadlineLabel}. ${reason}`.trim();
  }
  if (escalation && !reason.includes(escalation.slice(0, 20))) {
    reason = `${reason} ${escalation}`.trim();
  }

  const effectiveStatus: OwnerReminderView["effectiveStatus"] =
    input.item.status === "snoozed" && snoozeUntil && snoozeUntil > input.today
      ? "snoozed"
      : input.item.status === "pending" ||
          (input.item.status === "snoozed" && snoozeUntil && snoozeUntil <= input.today)
        ? "pending"
        : "done";

  return {
    taskId: input.item.taskId,
    title: input.item.title,
    reason,
    status: input.item.status,
    effectiveStatus,
    deadlineLabel,
    dueBy,
    urgency,
    snoozeCount,
    snoozeUntil,
    escalation,
    ruleId: input.item.ruleId,
  };
};

export const buildOwnerReminderViews = (input: {
  items: NowQueueItem[];
  scheduleRows: ScheduleProjectionRow[];
  today?: string;
}): OwnerReminderView[] => {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  return splitOwnerQueues(input.items).reminders
    .filter((item) => isActiveReminder(item, today))
    .map((item) => buildOwnerReminderView({ item, scheduleRows: input.scheduleRows, today }))
    .sort((a, b) => {
      const urgencyOrder: Record<ReminderUrgency, number> = {
        overdue: 0,
        due_now: 1,
        due_soon: 2,
        upcoming: 3,
        snoozed: 4,
      };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
};
