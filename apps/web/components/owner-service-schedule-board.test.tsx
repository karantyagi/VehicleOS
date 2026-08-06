import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OwnerDueItemsView } from "@vehicleos/domain";
import type { QueueItem } from "@/lib/console-types";

vi.mock("./maintenance-item-trust-actions", () => ({
  MaintenanceItemTrustActions: () => null,
}));

import { OwnerServiceScheduleBoardView } from "./owner-service-schedule-board";

const dueItems: OwnerDueItemsView = {
  effectiveMilesPerYear: 12_000,
  summary: {
    overdue: 0,
    dueSoon: 1,
    current: 0,
    monitor: 0,
    needsBaseline: 0,
    ownershipOverdue: 0,
    ownershipDueSoon: 0,
    maintenanceOverdue: 0,
    maintenanceDueSoon: 1,
  },
  items: [
    {
      id: "maintenance:engine-oil",
      kind: "maintenance",
      verdict: "due_soon",
      title: "Engine oil and filter",
      subtitle: "OEM interval",
      dueDate: "2026-08-20",
      dueMileage: 42_045,
      maintenanceRow: {
        entryId: "engine-oil",
        serviceName: "Engine oil and filter",
        systemGroup: "Engine",
        dueDate: "2026-08-20",
        dueMileage: 42_045,
        status: "due_soon",
        serviceBaseline: {
          performedDate: "2025-12-20",
          performedMileage: 34_045,
          baselineSource: "carfax",
        },
        oemInterval: { months: 12, miles: 8_000 },
        oemSource: { manualTitle: "Owner's manual", page: "421", ruleId: "oem.oil.v1" },
        dueDateConfidence: "oem_calendar",
        isStubSchedule: false,
        oemTiming: null,
        overdueWithoutHistory: false,
        displayName: "Engine oil and filter",
        mmCode: null,
        oemRuleLabel: "Every 8,000 mi or 12 months",
        verdict: "due_soon",
        historyEvents: [
          {
            serviceId: "service-oil-1",
            serviceDate: "2025-12-20",
            mileage: 34_045,
            shop: "Quick Lube",
            lineItem: "Engine oil and filter",
            source: "carfax_import",
          },
        ],
        gapNote: null,
        milesSinceLast: 4_826,
      },
    },
  ],
};

const tireRotationDueItems: OwnerDueItemsView = {
  ...dueItems,
  items: [
    {
      ...dueItems.items[0]!,
      id: "maintenance:mm-sub-1",
      title: "Rotate tires",
      maintenanceRow: {
        ...dueItems.items[0]!.maintenanceRow!,
        entryId: "mm-sub-1",
        serviceName: "Rotate tires",
        displayName: "Rotate tires",
        mmCode: "1",
        oemRuleLabel: "7,500 mi / 12 mo",
        intelligence: {
          itemKind: "tire_rotation",
          whyNow: "Your documented tire rotations support a personal interval.",
          reminderConfidence: "medium",
          axes: [],
          intervalRecommendation: {
            status: "active",
            recommendedMiles: 6_000,
            projectedDueMileage: 42_045,
            recentGapsMiles: [6_200, 5_800, 6_000],
            recentAverageMiles: 6_000,
            recentMedianMiles: 6_000,
            evidenceNote: "3 documented tire rotations",
            rationale: "Your recent tire rotations are consistent at about 6,000 miles.",
            confidence: "medium",
            activeSource: "oem",
            activeLabel: "7,500 mi / 12 mo",
          },
          actionRecommendation: {
            status: "upcoming",
            method: null,
            providerName: null,
            providerLocation: null,
            expectedTimeLabel: "Not available",
            expectedCost: {
              amount: null,
              currency: "USD",
              label: "Cost unavailable",
              basis: "unknown",
              requiresConfirmation: false,
            },
            whyThisOption: [],
            ownerFit: [],
            confidence: { provider: "not_scored", cost: "not_scored", booking: "not_scored" },
            nextAction: { label: "", url: null, verifiedAt: null },
            evidenceIds: [],
            confirmationPrompt: null,
          },
          serviceAction: {
            entryId: "mm-sub-1",
            canonicalServiceId: "generic.tire_rotation",
            recordLineItem: "Tires rotated",
            baselineServiceId: "service-rotation-1",
            baselineServiceDate: "2025-12-20",
            baselineMileage: 34_045,
          },
        },
      },
    },
  ],
};

const renderBoard = (
  focusedEntryId: string | null,
  items: OwnerDueItemsView = dueItems,
  attentionItems: QueueItem[] = [],
) =>
  renderToStaticMarkup(
    <OwnerServiceScheduleBoardView
      dueItems={items}
      currentMileage={38_871}
      focusedEntryId={focusedEntryId}
      attentionItems={attentionItems}
      onReviewAttentionTask={vi.fn()}
    />,
  );

describe("OwnerServiceScheduleBoardView service journey", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps detailed service history quiet while a maintenance item is collapsed", () => {
    const markup = renderBoard(null);

    expect(markup).toContain("Engine oil and filter");
    expect(markup).not.toContain("Service journey");
    expect(markup).not.toContain("Quick Lube");
  });

  it("keeps the service journey as a collapsed, deeper evidence reveal", () => {
    const markup = renderBoard("engine-oil");
    const journey = markup.match(/<details[^>]*data-testid="service-journey-engine-oil"[^>]*>/)?.[0];

    expect(markup).toContain("Service journey");
    expect(journey).toBeDefined();
    expect(journey).not.toContain("open");
    expect(markup).toContain("Open for evidence");
    expect(markup).toContain("38,871 mi");
    expect(markup).toContain("42,045 mi");
    expect(markup).toContain("Quick Lube");
    expect(markup).toContain("Engine oil and filter");
    expect(markup).toContain("<details");
  });

  it("opens the exact tire-rotation card at its personal interval", () => {
    const markup = renderBoard("mm-sub-1", tireRotationDueItems);

    expect(markup).toMatch(/id="maintenance-item-mm-sub-1"[\s\S]*?aria-expanded="true"/);
    expect(markup).toContain("My tire-rotation interval");
    expect(markup).toContain('aria-label="My tire-rotation interval in miles"');
  });

  it("links a schedule question to the shared attention item", () => {
    const markup = renderBoard("engine-oil", dueItems, [
      {
        taskId: "confirm-oil-date",
        title: "Confirm service date",
        reason: "The imported date needs an owner decision.",
        status: "pending",
        taskKind: "verification",
        severity: "blocking",
        verificationCode: "VERIFY_DATE",
        target: {
          surface: "schedule",
          recordId: "engine-oil",
          field: "service_date",
          label: "oil schedule",
        },
      },
    ]);

    expect(markup).toContain("VehicleOS needs your answer");
    expect(markup).toContain("Can you confirm this service date?");
    expect(markup).toContain("Open question");
  });

  it("uses a concrete time cue before the owner opens a due-soon item", () => {
    vi.setSystemTime(new Date("2026-08-03T12:00:00"));

    const markup = renderBoard(null);

    expect(markup).toContain("Due in 3 weeks");
    expect(markup).toContain("Next 3 weeks");
    expect(markup).toContain('aria-controls="maintenance-time-group-next_three_weeks"');
  });

  it("calls out items due in the current calendar week", () => {
    vi.setSystemTime(new Date("2026-08-17T12:00:00"));

    const markup = renderBoard(null);

    expect(markup).toContain("Due this week");
    expect(markup).toContain('aria-controls="maintenance-time-group-this_week"');
  });

  it("does not describe the following calendar week as this week", () => {
    vi.setSystemTime(new Date("2026-08-16T12:00:00"));

    const markup = renderBoard(null);

    expect(markup).toContain("Due in 1 week");
    expect(markup).not.toContain("Due this week");
  });

  it("caps longer lead times at one month", () => {
    vi.setSystemTime(new Date("2026-07-20T12:00:00"));

    const markup = renderBoard(null);

    expect(markup).toContain("Due in 1 month+");
  });
});
