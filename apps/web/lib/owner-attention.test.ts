import { describe, expect, it } from "vitest";
import type { OwnerReminderItem, QueueItem } from "@/lib/console-types";
import { getOwnerQuestionPresentation, sortOwnerActions, sortOwnerQuestions } from "./owner-attention";

const question = (overrides: Partial<QueueItem>): QueueItem => ({
  taskId: "question",
  title: "Confirm record",
  reason: "The import needs a decision.",
  status: "pending",
  taskKind: "verification",
  severity: "advisory",
  ...overrides,
});

const action = (overrides: Partial<OwnerReminderItem>): OwnerReminderItem => ({
  taskId: "action",
  title: "Rotate tires",
  reason: "Due soon.",
  status: "pending",
  effectiveStatus: "pending",
  deadlineLabel: "This week",
  dueBy: "2026-08-10",
  urgency: "due_soon",
  attentionWindow: "this_week",
  ...overrides,
});

describe("owner attention presentation", () => {
  it("uses owner-facing Verify and Personalize questions", () => {
    expect(getOwnerQuestionPresentation(question({ verificationCode: "VERIFY_IMPORT_ROW" }))).toMatchObject({
      kind: "verify",
      title: "Can you confirm this imported service record?",
      approveLabel: "Yes, use this record",
    });
    expect(getOwnerQuestionPresentation(question({ verificationCode: "VERIFY_OWNER_INTERVAL" }))).toMatchObject({
      kind: "personalize",
      title: "Does this interval fit how you use your car?",
    });
  });

  it("prioritizes blocking facts before personalization and urgent actions first", () => {
    const questions = sortOwnerQuestions([
      question({ taskId: "personalize", verificationCode: "VERIFY_OWNER_INTERVAL", severity: "blocking" }),
      question({ taskId: "verify", verificationCode: "VERIFY_IMPORT_ROW", severity: "blocking" }),
      question({ taskId: "advisory", verificationCode: "VERIFY_DATE", severity: "advisory" }),
    ]);
    expect(questions.map((item) => item.taskId)).toEqual(["verify", "personalize", "advisory"]);

    const actions = sortOwnerActions([
      action({ taskId: "later", urgency: "upcoming" }),
      action({ taskId: "overdue", urgency: "overdue" }),
      action({ taskId: "soon", urgency: "due_soon" }),
    ]);
    expect(actions.map((item) => item.taskId)).toEqual(["overdue", "soon", "later"]);
  });
});
