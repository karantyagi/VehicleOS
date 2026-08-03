import { describe, expect, it } from "vitest";
import { buildOwnerDueItems } from "../owner-care/build-owner-due-items.js";
import { buildOwnerReminderViews } from "./build-owner-reminders.js";
import { REGISTRATION_RENEWAL_MA_RULE_ID } from "../ownership/resolve-renewal-rule-id.js";
import { ONBOARDING_BASELINE_RULE_ID } from "../owner-care/onboarding-baseline.js";

describe("buildOwnerReminderViews", () => {
  it("shows MA registration renewal using unified due items", () => {
    const dueItems = buildOwnerDueItems({
      board: null,
      ownershipRecords: [
        {
          recordId: "reg-1",
          agency: "Massachusetts RMV (myRMV)",
          recordDate: "2026-02-01",
          mileage: null,
          eventType: "registration",
          description: "Registration active — plate 1NST41",
          details: ["Expiration Date: 2026-08-05", "Status: Active"],
          source: "rmv_import",
        },
      ],
      today: "2026-07-27",
    });

    const reminders = buildOwnerReminderViews({
      items: [
        {
          taskId: "task-reg",
          recommendationId: "rec-reg",
          title: "Registration renewal",
          reason: "Registration expires 2026-08-05 — Massachusetts RMV (myRMV).",
          status: "pending",
          taskKind: "recommendation",
          ruleId: REGISTRATION_RENEWAL_MA_RULE_ID,
        },
      ],
      scheduleRows: [],
      dueItems,
      today: "2026-07-27",
    });

    expect(reminders).toHaveLength(1);
    expect(reminders[0]?.dueBy).toBe("2026-08-05");
    expect(reminders[0]?.urgency).toBe("due_soon");
  });

  it("does not invent a deadline for the first-service baseline", () => {
    const reminders = buildOwnerReminderViews({
      items: [
        {
          taskId: "task-onboarding",
          recommendationId: "rec-onboarding",
          title: "Log your first service",
          reason: "By end of this week No maintenance history yet.",
          status: "pending",
          taskKind: "recommendation",
          ruleId: ONBOARDING_BASELINE_RULE_ID,
        },
      ],
      scheduleRows: [],
      today: "2026-08-01",
    });

    expect(reminders[0]).toMatchObject({
      dueBy: null,
      deadlineLabel: "Set your maintenance baseline",
      urgency: "upcoming",
      reason: "Add one completed service to personalize future maintenance recommendations.",
    });
  });
});
