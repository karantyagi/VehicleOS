import { describe, expect, it } from "vitest";
import { formatOwnerDeadline, formatSnoozeEscalation } from "./format-owner-deadline.js";
import { buildOwnerReminderViews, isActiveReminder } from "./build-owner-reminders.js";
import type { NowQueueItem } from "../projections/types.js";
import type { ServiceTimelineEntry } from "../projections/types.js";
import { projectMaintenanceSchedule } from "../schedule/project-maintenance-schedule.js";

describe("formatOwnerDeadline", () => {
  it("uses calendar language not mileage", () => {
    expect(formatOwnerDeadline("2026-07-30", "2026-07-24")).toBe("By end of this week");
    expect(formatOwnerDeadline("2026-07-20", "2026-07-24")).toBe("Overdue — act now");
  });
});

describe("formatSnoozeEscalation", () => {
  it("escalates after repeated snoozes", () => {
    expect(formatSnoozeEscalation(0)).toBeNull();
    expect(formatSnoozeEscalation(2)).toMatch(/snoozed this twice/i);
  });
});

describe("buildOwnerReminderViews", () => {
  const baseItem: NowQueueItem = {
    taskId: "task-1",
    recommendationId: "rec-1",
    title: "Oil change",
    reason: "Assistant projected this from OEM intervals and recent service.",
    status: "pending",
    taskKind: "recommendation",
    ruleId: "schedule.policy.oil_change.v1",
    dueBy: "2026-07-30",
  };

  it("surfaces snoozed items when snooze period ends", () => {
    const snoozed: NowQueueItem = {
      ...baseItem,
      status: "snoozed",
      snoozeUntil: "2026-07-24",
      snoozeCount: 2,
    };
    expect(isActiveReminder(snoozed, "2026-07-24")).toBe(true);
    expect(isActiveReminder(snoozed, "2026-07-20")).toBe(false);

    const views = buildOwnerReminderViews({
      items: [snoozed],
      scheduleRows: [],
      today: "2026-07-24",
    });
    expect(views).toHaveLength(1);
    expect(views[0]?.escalation).toMatch(/twice/i);
  });

  it("hides stale knowledge reminders when CARFAX oil baseline is within interval", () => {
    const timelineRow = (overrides: Partial<ServiceTimelineEntry>): ServiceTimelineEntry => ({
      serviceId: "svc-1",
      shop: "Dealer",
      serviceDate: "2026-05-13",
      mileage: 57_160,
      lineItems: ["Oil and filter changed"],
      total: "$0.00",
      evidenceIds: [],
      source: "carfax_import",
      ...overrides,
    });

    const scheduleRows = projectMaintenanceSchedule({
      knowledgeSchedule: [
        {
          entryId: "code-b",
          serviceName: "Replace engine oil and filter (Maintenance Minder B)",
          intervalMonths: 12,
          intervalMiles: 7_500,
          sourceDocumentId: "doc-1",
          manualTitle: "Owner manual",
          sourcePage: "P. 527 — Code B",
          recordedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      timeline: [
        timelineRow({
          lineItems: ["Vehicle serviced", "Maintenance inspection completed", "Oil and filter changed"],
        }),
      ],
      currentMileage: 58_819,
      today: "2026-07-25",
      horizonMode: "extended",
    }).rows;

    const views = buildOwnerReminderViews({
      items: [
        {
          taskId: "task-oil",
          recommendationId: "rec-1",
          title: "Replace engine oil and filter (Maintenance Minder B) due",
          reason:
            "OEM schedule (P. 527 — Code B): every 7,500 mi. 59,024 miles since last recorded replace engine oil and filter (maintenance minder b).",
          status: "pending",
          taskKind: "recommendation",
          ruleId: "knowledge.policy.code-b.v1",
        },
      ],
      scheduleRows,
      today: "2026-07-25",
    });

    expect(scheduleRows[0]?.status).toBe("upcoming");
    expect(views).toHaveLength(0);
  });
});
