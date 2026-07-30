import type { NowQueueItem } from "../projections/types.js";
import type { ScheduleProjectionRow } from "../schedule/project-maintenance-schedule.js";
import { isRenewalRuleId } from "../ownership/resolve-renewal-rule-id.js";
import type { OwnerDueItemsView } from "../owner-care/build-owner-due-items.js";
import type { MaintenanceItemIntelligence } from "../schedule/build-maintenance-item-intelligence.js";
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
  intelligence?: MaintenanceItemIntelligence;
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

const resolveDueBy = (input: {
  item: NowQueueItem;
  scheduleRows: ScheduleProjectionRow[];
  dueItems?: OwnerDueItemsView | null;
}): string | null => {
  if (input.item.dueBy) return input.item.dueBy;

  if (input.dueItems && input.item.ruleId) {
    if (isRenewalRuleId(input.item.ruleId)) {
      const ownershipMatch = input.dueItems.items.find(
        (dueItem) =>
          dueItem.kind === "ownership" &&
          (dueItem.verdict === "overdue" || dueItem.verdict === "due_soon"),
      );
      if (ownershipMatch?.dueDate) return ownershipMatch.dueDate;
    }

    if (input.item.ruleId.startsWith("knowledge.policy.")) {
      const entryId = input.item.ruleId.replace(/^knowledge\.policy\./, "").replace(/\.v\d+$/, "");
      const maintenanceMatch = input.dueItems.items.find(
        (dueItem) => dueItem.kind === "maintenance" && dueItem.maintenanceRow?.entryId === entryId,
      );
      if (maintenanceMatch?.dueDate) return maintenanceMatch.dueDate;
    }
  }

  const row = matchScheduleRowForRule(input.item.ruleId, input.scheduleRows);
  return row?.dueDate ?? null;
};

const resolveMaintenanceIntelligence = (input: {
  item: NowQueueItem;
  dueItems?: OwnerDueItemsView | null;
}): MaintenanceItemIntelligence | undefined => {
  if (!input.dueItems || !input.item.ruleId?.startsWith("knowledge.policy.")) {
    return undefined;
  }

  const entryId = input.item.ruleId
    .replace(/^knowledge\.policy\./, "")
    .replace(/\.v\d+$/, "");
  return input.dueItems.items.find(
    (dueItem) =>
      dueItem.kind === "maintenance" &&
      dueItem.maintenanceRow?.entryId === entryId,
  )?.maintenanceRow?.intelligence;
};

export const buildOwnerReminderView = (input: {
  item: NowQueueItem;
  scheduleRows: ScheduleProjectionRow[];
  dueItems?: OwnerDueItemsView | null;
  today: string;
}): OwnerReminderView => {
  const dueBy = resolveDueBy({
    item: input.item,
    scheduleRows: input.scheduleRows,
    dueItems: input.dueItems,
  });
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
  const intelligence = resolveMaintenanceIntelligence({
    item: input.item,
    dueItems: input.dueItems,
  });

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
    ...(intelligence ? { intelligence } : {}),
  };
};

export const buildOwnerReminderViews = (input: {
  items: NowQueueItem[];
  scheduleRows: ScheduleProjectionRow[];
  dueItems?: OwnerDueItemsView | null;
  today?: string;
}): OwnerReminderView[] => {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  return splitOwnerQueues(input.items).reminders
    .filter((item) => {
      if (!isActiveReminder(item, today)) return false;
      if (isRenewalRuleId(item.ruleId)) return true;
      const row = matchScheduleRowForRule(item.ruleId, input.scheduleRows);
      if (item.ruleId?.startsWith("knowledge.policy.") && row?.status === "upcoming") {
        return false;
      }
      return true;
    })
    .map((item) =>
      buildOwnerReminderView({
        item,
        scheduleRows: input.scheduleRows,
        dueItems: input.dueItems,
        today,
      }),
    )
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
