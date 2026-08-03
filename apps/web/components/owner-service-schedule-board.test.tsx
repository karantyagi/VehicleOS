import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { OwnerDueItemsView } from "@vehicleos/domain";

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

const renderBoard = (focusedEntryId: string | null) =>
  renderToStaticMarkup(
    <OwnerServiceScheduleBoardView
      dueItems={dueItems}
      currentMileage={38_871}
      focusedEntryId={focusedEntryId}
    />,
  );

describe("OwnerServiceScheduleBoardView service journey", () => {
  it("keeps detailed service history quiet while a maintenance item is collapsed", () => {
    const markup = renderBoard(null);

    expect(markup).toContain("Engine oil and filter");
    expect(markup).not.toContain("Service journey");
    expect(markup).not.toContain("Quick Lube");
  });

  it("shows the timeline and every matching service record on the first item expansion", () => {
    const markup = renderBoard("engine-oil");

    expect(markup).toContain("Service journey");
    expect(markup).toContain("Completed service");
    expect(markup).toContain("38,871 mi");
    expect(markup).toContain("42,045 mi");
    expect(markup).toContain("Quick Lube");
    expect(markup).toContain("Engine oil and filter");
  });
});
