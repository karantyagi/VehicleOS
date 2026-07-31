import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { OwnerReminderItem } from "@/lib/console-types";
import { RemindersConsole } from "./reminders-console";

const rotationReminder: OwnerReminderItem = {
  taskId: "task-rotate-tires",
  title: "Rotate tires",
  reason: "Mileage interval reached.",
  status: "pending",
  effectiveStatus: "pending",
  deadlineLabel: "Within the next month",
  dueBy: "2026-08-20",
  urgency: "due_soon",
  attentionWindow: "this_month",
  ruleId: "knowledge.policy.mm-sub-1.v1",
  intelligence: {
    itemKind: "tire_rotation",
    whyNow: "Current 59,100 mi · target 64,819 mi · 5,719 mi remaining",
    reminderConfidence: "medium",
    axes: [
      { id: "vehicle_oem", label: "Vehicle & OEM", state: "available", summary: "7,500 mi · verified pack" },
      { id: "service_history", label: "Service history", state: "available", summary: "Last confirmed 2026-07-15 · 58,819 mi" },
      { id: "owner_use_preferences", label: "Owner use & preferences", state: "available", summary: "10,000 mi/year · safety" },
      { id: "condition_setup", label: "Condition & setup", state: "available", summary: "No inspect-sooner signal" },
    ],
    intervalRecommendation: {
      status: "active",
      recommendedMiles: 6_000,
      projectedDueMileage: 64_819,
      recentGapsMiles: [5_853, 7_982, 5_594],
      recentAverageMiles: 6_476,
      recentMedianMiles: 5_853,
      evidenceNote: "3 current-tire intervals · variable",
      rationale: "Current tire-set median 5,853 mi · OEM 7,500 mi",
      confidence: "medium",
      activeSource: "oem",
      activeLabel: "7,500 mi",
    },
    actionRecommendation: {
      status: "active",
      method: "tire_retailer",
      providerName: "Costco Tire Center",
      providerLocation: "Waltham, MA",
      expectedTimeLabel: "Time estimate not available yet",
      expectedCost: {
        amount: 0,
        currency: "USD",
        label: "Expected $0",
        basis: "observed_history",
        requiresConfirmation: true,
      },
      whyThisOption: ["The current tire set was installed at Costco."],
      ownerFit: ["Safety"],
      confidence: { provider: "high", cost: "medium", booking: "medium" },
      nextAction: { label: "Open Costco Tire Center", url: "https://tires.costco.com/", verifiedAt: "2026-07-30" },
      evidenceIds: ["carfax-rotation-latest"],
      confirmationPrompt: "Confirm that rotations remain included.",
    },
    serviceAction: {
      entryId: "mm-sub-1",
      canonicalServiceId: "generic.tire_rotation",
      recordLineItem: "Rotate tires",
      baselineServiceId: "service-rotation-latest",
      baselineServiceDate: "2026-07-15",
      baselineMileage: 58_819,
    },
  },
};

const renderReminder = (focusTaskId: string | null) =>
  renderToStaticMarkup(
    <RemindersConsole
      items={[rotationReminder]}
      focusTaskId={focusTaskId}
      onScheduled={vi.fn()}
      onNotNeeded={vi.fn()}
      onRecordDone={vi.fn()}
      onFixData={vi.fn()}
      minimal
    />,
  );

describe("RemindersConsole trust copy", () => {
  it("keeps rationale collapsed by default", () => {
    const markup = renderReminder(null);
    expect(markup).toContain("Rotate tires");
    expect(markup).not.toContain("Why this needs attention");
    expect(markup).not.toContain("Assistant recommends 6,000 miles");
  });

  it("opens the exact reminder targeted by a deep link", () => {
    const markup = renderReminder("task-rotate-tires");
    expect(markup).toContain("Why this needs attention");
    expect(markup).toContain("Assistant recommends 6,000 miles");
    expect(markup).toContain("Costco Tire Center");
  });
});
