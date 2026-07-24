import { describe, expect, it } from "vitest";
import { formatOwnerDeadline, formatSnoozeEscalation } from "./format-owner-deadline.js";
import { buildOwnerReminderViews, isActiveReminder } from "./build-owner-reminders.js";
import type { NowQueueItem } from "../projections/types.js";

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
});
