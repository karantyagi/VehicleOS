import {
  EVENT_TYPES,
  type CatalogDomainEvent,
  type TaskDecision,
} from "../events/catalog.js";
import { findMatchingServices } from "../knowledge/match-service-name.js";
import type { NowQueueItem, ServiceTimelineEntry } from "../projections/types.js";
import type { ScheduleProjectionRow } from "../schedule/project-maintenance-schedule.js";
import { isRenewalRuleId } from "../ownership/resolve-renewal-rule-id.js";
import type { OwnerDueItemsView } from "../owner-care/build-owner-due-items.js";
import type { MaintenanceItemIntelligence } from "../schedule/build-maintenance-item-intelligence.js";
import { parseDeviationRuleEntryId } from "../schedule/deviation-rule-id.js";
import { parseIntervalRuleEntryId } from "../schedule/interval-rule-id.js";
import {
  isOnboardingBaselineRule,
  ONBOARDING_BASELINE_DEADLINE_LABEL,
  ONBOARDING_BASELINE_REASON,
} from "../owner-care/onboarding-baseline.js";
import {
  formatOwnerDeadline,
  resolveAttentionWindow,
  resolveReminderUrgency,
  type AttentionWindow,
  type ReminderUrgency,
} from "./format-owner-deadline.js";
import { matchScheduleRowForRule } from "./prepare-recommendation-task.js";

export type OwnerReminderView = {
  taskId: string;
  title: string;
  reason: string;
  status: NowQueueItem["status"];
  effectiveStatus: "pending" | "done";
  deadlineLabel: string;
  dueBy: string | null;
  urgency: ReminderUrgency;
  attentionWindow: AttentionWindow;
  ruleId?: string;
  intelligence?: MaintenanceItemIntelligence;
};

export type OwnerVerificationSeverity = "blocking" | "advisory";

export type OwnerVerificationTarget = {
  surface: "home" | "history" | "schedule" | "imports" | "vehicle";
  recordId: string | null;
  field:
    | "mileage"
    | "service_date"
    | "vehicle_profile"
    | "import_rows"
    | "maintenance_timing"
    | "owner_interval"
    | null;
  label: string;
};

export type OwnerVerificationView = NowQueueItem & {
  severity: OwnerVerificationSeverity;
  target: OwnerVerificationTarget;
  resolvedAt: string | null;
  resolution: TaskDecision | null;
};

export const splitOwnerQueues = (items: NowQueueItem[]): {
  reminders: NowQueueItem[];
  verifications: NowQueueItem[];
} => ({
  reminders: items.filter((item) => (item.taskKind ?? "recommendation") !== "verification"),
  verifications: items.filter((item) => item.taskKind === "verification"),
});

const resolveVerificationSeverity = (item: NowQueueItem): OwnerVerificationSeverity => {
  if (
    item.verificationCode === "VERIFY_DATE" ||
    item.verificationCode === "VERIFY_VEHICLE_PROFILE" ||
    item.verificationCode === "VERIFY_IMPORT_ROW"
  ) {
    return "blocking";
  }
  if (
    item.verificationCode === "VERIFY_ODOMETER" &&
    item.ruleId !== "assistant.policy.odometer_stale.v1"
  ) {
    return "blocking";
  }
  return "advisory";
};

const resolveRelatedServiceId = (input: {
  entryId: string;
  timeline: ServiceTimelineEntry[];
  scheduleRows: ScheduleProjectionRow[];
}): string | null => {
  const scheduleRow = input.scheduleRows.find((row) => row.entryId === input.entryId);
  if (!scheduleRow) return null;

  const matches = findMatchingServices(input.timeline, scheduleRow.serviceName);
  const baselineDate = scheduleRow.serviceBaseline.performedDate;
  const baselineMileage = scheduleRow.serviceBaseline.performedMileage;
  const exact = [...matches]
    .reverse()
    .find(
      (entry) =>
        (baselineDate === null || entry.serviceDate === baselineDate) &&
        (baselineMileage === null || entry.mileage === baselineMileage),
    );
  return exact?.serviceId ?? matches.at(-1)?.serviceId ?? null;
};

const resolveVerificationTarget = (
  item: NowQueueItem,
  context: {
    timeline: ServiceTimelineEntry[];
    scheduleRows: ScheduleProjectionRow[];
  },
): OwnerVerificationTarget => {
  if (item.verificationCode === "VERIFY_VEHICLE_PROFILE") {
    return { surface: "vehicle", recordId: null, field: "vehicle_profile", label: "Vehicle profile" };
  }
  if (item.verificationCode === "VERIFY_IMPORT_ROW") {
    return { surface: "imports", recordId: null, field: "import_rows", label: "Imported records" };
  }
  if (item.verificationCode === "VERIFY_DATE") {
    return { surface: "home", recordId: null, field: "service_date", label: "Service date" };
  }
  if (item.verificationCode === "VERIFY_ODOMETER") {
    const isStalePrompt = item.ruleId === "assistant.policy.odometer_stale.v1";
    return {
      surface: isStalePrompt ? "vehicle" : "home",
      recordId: null,
      field: "mileage",
      label: isStalePrompt ? "Current mileage" : "Odometer reading",
    };
  }

  const deviationEntryId = parseDeviationRuleEntryId(item.ruleId);
  if (deviationEntryId) {
    const serviceId = resolveRelatedServiceId({
      entryId: deviationEntryId,
      timeline: context.timeline,
      scheduleRows: context.scheduleRows,
    });
    return {
      surface: serviceId ? "history" : "schedule",
      recordId: serviceId ?? deviationEntryId,
      field: "maintenance_timing",
      label: "Maintenance timing",
    };
  }

  const intervalEntryId = parseIntervalRuleEntryId(item.ruleId);
  if (intervalEntryId) {
    return {
      surface: "schedule",
      recordId: intervalEntryId,
      field: "owner_interval",
      label: "Maintenance interval",
    };
  }

  return { surface: "home", recordId: null, field: null, label: "Assistant question" };
};

const inferResolution = (status: NowQueueItem["status"]): TaskDecision | null => {
  if (status === "approved") return "approve";
  if (status === "dismissed") return "dismiss";
  if (status === "scheduled") return "schedule";
  if (status === "completed") return "complete";
  return null;
};

export const buildOwnerVerificationViews = (
  items: NowQueueItem[],
  context: {
    events?: CatalogDomainEvent[];
    timeline?: ServiceTimelineEntry[];
    scheduleRows?: ScheduleProjectionRow[];
  } = {},
): OwnerVerificationView[] => {
  const decisions = new Map<string, { decision: TaskDecision; decidedAt: string }>();
  for (const event of context.events ?? []) {
    if (event.eventType !== EVENT_TYPES.TASK_DECIDED) continue;
    decisions.set(event.payload.taskId, {
      decision: event.payload.decision,
      decidedAt: event.payload.decidedAt,
    });
  }

  return splitOwnerQueues(items).verifications.map((item) => {
    const decision = decisions.get(item.taskId);
    return {
      ...item,
      severity: resolveVerificationSeverity(item),
      target: resolveVerificationTarget(item, {
        timeline: context.timeline ?? [],
        scheduleRows: context.scheduleRows ?? [],
      }),
      resolvedAt: decision?.decidedAt ?? null,
      resolution: decision?.decision ?? inferResolution(item.status),
    };
  });
};

export const isActiveReminder = (item: NowQueueItem): boolean => {
  if (item.taskKind === "verification") return false;
  return item.status === "pending";
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
  const isOnboardingBaseline = isOnboardingBaselineRule(input.item.ruleId);
  const dueBy = isOnboardingBaseline
    ? null
    : resolveDueBy({
        item: input.item,
        scheduleRows: input.scheduleRows,
        dueItems: input.dueItems,
      });
  const urgency = isOnboardingBaseline
    ? "upcoming"
    : resolveReminderUrgency({
        dueBy,
        today: input.today,
      });
  const attentionWindow = isOnboardingBaseline
    ? "this_week"
    : resolveAttentionWindow(dueBy, input.today);
  const deadlineLabel = isOnboardingBaseline
    ? ONBOARDING_BASELINE_DEADLINE_LABEL
    : formatOwnerDeadline(dueBy, input.today);
  const intelligence = resolveMaintenanceIntelligence({
    item: input.item,
    dueItems: input.dueItems,
  });

  let reason = isOnboardingBaseline ? ONBOARDING_BASELINE_REASON : input.item.reason;
  if (!isOnboardingBaseline && !reason.includes(deadlineLabel)) {
    reason = `${deadlineLabel}. ${reason}`.trim();
  }
  const effectiveStatus: OwnerReminderView["effectiveStatus"] =
    input.item.status === "pending" ? "pending" : "done";

  return {
    taskId: input.item.taskId,
    title: input.item.title,
    reason,
    status: input.item.status,
    effectiveStatus,
    deadlineLabel,
    dueBy,
    urgency,
    attentionWindow,
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
      if (!isActiveReminder(item)) return false;
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
      const windowOrder: Record<AttentionWindow, number> = {
        overdue: 0,
        this_week: 1,
        next_week: 2,
        this_month: 3,
        later: 4,
      };
      const windowDelta = windowOrder[a.attentionWindow] - windowOrder[b.attentionWindow];
      if (windowDelta !== 0) return windowDelta;
      const dueDelta = (a.dueBy ?? "9999-12-31").localeCompare(b.dueBy ?? "9999-12-31");
      if (dueDelta !== 0) return dueDelta;
      return a.title.localeCompare(b.title);
    });
};
