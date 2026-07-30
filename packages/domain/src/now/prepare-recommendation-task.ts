import type { MaintenanceRecommendation } from "../policy/types.js";
import type { DrivingStyle } from "../schedule/resolve-schedule-projection-context.js";
import { isRenewalRuleId } from "../ownership/resolve-renewal-rule-id.js";
import {
  projectMaintenanceSchedule,
  type ScheduleProjectionRow,
} from "../schedule/project-maintenance-schedule.js";
import { resolveScheduleProjectionContext } from "../schedule/resolve-schedule-projection-context.js";
import type { VehicleProjectionState } from "../projections/types.js";
import {
  addDays,
  formatOwnerDeadline,
  formatSnoozeEscalation,
  resolveReminderUrgency,
  type ReminderUrgency,
} from "./format-owner-deadline.js";

export type TimeFirstTaskCopy = {
  title: string;
  reason: string;
  dueBy: string | null;
  deadlineLabel: string;
  urgency: ReminderUrgency;
};

const ruleServicePatterns: Record<string, RegExp> = {
  "schedule.policy.oil_change.v1": /oil/i,
  "schedule.policy.cabin_filter.v1": /cabin/i,
  "schedule.policy.tire_rotation.v1": /tire|rotate/i,
  "schedule.policy.onboarding.v1": /.*/,
};

export const matchScheduleRowForRule = (
  ruleId: string | undefined,
  rows: ScheduleProjectionRow[],
): ScheduleProjectionRow | null => {
  if (!ruleId) return null;

  if (ruleId.startsWith("knowledge.policy.")) {
    const entryId = ruleId.replace(/^knowledge\.policy\./, "").replace(/\.v\d+$/, "");
    return rows.find((row) => row.entryId === entryId) ?? null;
  }

  if (ruleId.startsWith("seasonal.policy.")) {
    const slug = ruleId.replace(/^seasonal\.policy\./, "").replace(/\.v\d+$/, "");
    return rows.find((row) => slug.includes(row.serviceName.toLowerCase().replace(/\s+/g, "_"))) ?? null;
  }

  const pattern = ruleServicePatterns[ruleId];
  if (!pattern) return null;
  return rows.find((row) => pattern.test(row.serviceName)) ?? null;
};

const stripMileageLead = (reason: string): string =>
  reason
    .replace(/^\d[\d,]* miles since[^.]+\.\s*/i, "")
    .replace(/OEM schedule[^:]*:\s*every\s*[\d,]+\s*mi\.?\s*/i, "")
    .replace(/\s*Interval target is [\d,]+ miles\.?\s*/i, " ")
    .trim();

const buildWhySnippet = (input: {
  scheduleRow: ScheduleProjectionRow | null;
  contextReason: string;
}): string => {
  const cleaned = stripMileageLead(input.contextReason);
  if (input.scheduleRow?.status === "overdue") {
    return "Assistant flagged this from your service history and OEM schedule.";
  }
  if (cleaned.length > 0 && !/^\d/.test(cleaned)) return cleaned;
  return "Your assistant projected this from OEM intervals and recent service.";
};

export const buildTimeFirstTaskCopy = (input: {
  recommendation: MaintenanceRecommendation;
  scheduleRows: ScheduleProjectionRow[];
  today?: string;
  snoozeCount?: number;
}): TimeFirstTaskCopy => {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const scheduleRow = matchScheduleRowForRule(input.recommendation.ruleId, input.scheduleRows);
  const dueBy =
    input.recommendation.dueBy ??
    scheduleRow?.dueDate ??
    (scheduleRow?.status === "overdue" ? today : addDays(today, 7));

  const deadlineLabel = formatOwnerDeadline(dueBy, today);
  const why = buildWhySnippet({ scheduleRow, contextReason: input.recommendation.reason });
  const escalation = formatSnoozeEscalation(input.snoozeCount ?? 0);
  const reasonParts = [deadlineLabel, why, escalation].filter(Boolean);
  const reason = `${reasonParts.join(" ")}`.trim();

  const urgency = isRenewalRuleId(input.recommendation.ruleId)
    ? resolveReminderUrgency({ dueBy, today, status: "pending", snoozeUntil: null })
    : scheduleRow?.status === "overdue"
      ? "overdue"
      : scheduleRow?.status === "due_soon"
        ? "due_soon"
        : "upcoming";

  return {
    title: input.recommendation.title.replace(/\s+due$/i, ""),
    reason,
    dueBy,
    deadlineLabel,
    urgency,
  };
};

export const projectScheduleRowsForRecommendations = (input: {
  state: VehicleProjectionState;
  ownedSince?: string | null;
  drivingStyle?: DrivingStyle | null;
  statedMilesPerYear?: number | null;
}): ScheduleProjectionRow[] => {
  const scheduleContext = resolveScheduleProjectionContext({
    ownedSince: input.ownedSince ?? null,
    drivingStyle: input.drivingStyle ?? null,
    statedMilesPerYear: input.statedMilesPerYear ?? null,
    timeline: input.state.timeline,
  });

  return projectMaintenanceSchedule({
    knowledgeSchedule: input.state.knowledgeSchedule,
    timeline: input.state.timeline,
    currentMileage: input.state.currentMileage,
    effectiveMilesPerYear: scheduleContext.effectiveMilesPerYear,
    ownedSince: scheduleContext.ownedSince,
    dueSoonDays: scheduleContext.dueSoonDays,
    horizonMode: "extended",
  }).rows;
};
