import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { OwnerReminderItem, QueueItem } from "@/lib/console-types";
import { OwnerHomeBrief } from "./owner-home-brief";

const reminder: OwnerReminderItem = {
  taskId: "rotate-tires",
  title: "Rotate tires",
  reason: "The service interval is due soon.",
  status: "pending",
  effectiveStatus: "pending",
  deadlineLabel: "By end of this week",
  dueBy: "2026-08-09",
  urgency: "due_soon",
  attentionWindow: "this_week",
};

const question: QueueItem = {
  taskId: "confirm-import",
  title: "Confirm import",
  reason: "The record needs confirmation.",
  status: "pending",
  taskKind: "verification",
  severity: "blocking",
  verificationCode: "VERIFY_IMPORT_ROW",
};

describe("OwnerHomeBrief", () => {
  it("shows one priority step and compact paths to the complete queue", () => {
    const markup = renderToStaticMarkup(
      <OwnerHomeBrief
        reminders={[reminder]}
        verifications={[question]}
        onOpenAttention={vi.fn()}
        onOpenMaintenance={vi.fn()}
      />,
    );

    expect(markup).toContain("One clear next step");
    expect(markup).toContain("Can you confirm this imported service record?");
    expect(markup).toContain("Act for your car");
    expect(markup).toContain("Help the assistant");
    expect(markup).toContain("1 open");
    expect(markup).toContain("1 question");
    expect(markup).not.toContain("Why am I being asked?");
  });

  it("reassures the owner when no work is open", () => {
    const markup = renderToStaticMarkup(
      <OwnerHomeBrief
        reminders={[]}
        verifications={[]}
        onOpenAttention={vi.fn()}
        onOpenMaintenance={vi.fn()}
      />,
    );

    expect(markup).toContain("You&#x27;re up to date");
    expect(markup).toContain("No maintenance actions waiting.");
    expect(markup).toContain("No questions waiting for you.");
  });
});
