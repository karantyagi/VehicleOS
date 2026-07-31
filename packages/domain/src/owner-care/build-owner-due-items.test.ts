import { describe, expect, it } from "vitest";
import { buildOwnerDueItems } from "./build-owner-due-items.js";
import type { OwnerServiceScheduleBoard } from "../schedule/build-owner-service-schedule-board.js";

const emptyBoard = (): OwnerServiceScheduleBoard => ({
  rows: [],
  summary: {
    overdue: 0,
    dueSoon: 0,
    current: 0,
    monitor: 0,
    needsBaseline: 0,
  },
  effectiveMilesPerYear: 12_000,
});

describe("buildOwnerDueItems", () => {
  it("places ownership overdue before maintenance overdue", () => {
    const board: OwnerServiceScheduleBoard = {
      ...emptyBoard(),
      rows: [
        {
          entryId: "oil-change",
          serviceName: "Engine oil and filter",
          systemGroup: "Fluids",
          displayName: "Engine oil and filter",
          mmCode: null,
          oemRuleLabel: "Every 5,000 mi",
          verdict: "overdue",
          historyEvents: [],
          gapNote: null,
          milesSinceLast: 6_000,
          dueDate: "2026-06-01",
          dueMileage: 30_000,
          status: "overdue",
          serviceBaseline: {
            performedDate: "2025-12-01",
            performedMileage: 24_000,
            baselineSource: "carfax",
          },
          oemInterval: { months: 6, miles: 5_000 },
          oemSource: { manualTitle: "2022 Elantra", page: "9-9", ruleId: "oil.v1" },
          dueDateConfidence: "oem_calendar",
          isStubSchedule: false,
          oemTiming: "late",
          overdueWithoutHistory: false,
        },
      ],
      summary: {
        overdue: 1,
        dueSoon: 0,
        current: 0,
        monitor: 0,
        needsBaseline: 0,
      },
    };

    const view = buildOwnerDueItems({
      board,
      ownershipRecords: [
        {
          recordId: "reg-1",
          agency: "Massachusetts RMV (myRMV)",
          recordDate: "2026-02-01",
          mileage: null,
          eventType: "registration",
          description: "Registration active — plate 1NST41",
          details: [
            "Type/Number: Passenger Normal Red Plate/1NST41",
            "Expiration date: 2026-03-01",
            "Status: Active",
          ],
          source: "rmv_import",
        },
      ],
      today: "2026-07-01",
    });

    expect(view.summary.overdue).toBe(2);
    expect(view.summary.ownershipOverdue).toBe(1);
    expect(view.summary.maintenanceOverdue).toBe(1);
    expect(view.items[0]?.kind).toBe("ownership");
    expect(view.items[0]?.verdict).toBe("overdue");
    expect(view.items[1]?.kind).toBe("maintenance");
  });

  it("returns empty view when no board and no renewals", () => {
    const view = buildOwnerDueItems({
      board: null,
      ownershipRecords: [],
      today: "2026-07-01",
    });

    expect(view.items).toHaveLength(0);
    expect(view.summary.overdue).toBe(0);
  });

  it("counts a future driver license renewal as monitor without making it actionable", () => {
    const view = buildOwnerDueItems({
      board: emptyBoard(),
      ownershipRecords: [
        {
          recordId: "license-1",
          agency: "Massachusetts RMV (myRMV)",
          recordDate: "2024-04-16",
          mileage: null,
          eventType: "license",
          description: "Driver's license active — Class D",
          details: ["License class: D", "Expiration Date: 2026-10-10"],
          source: "rmv_import",
        },
      ],
      today: "2026-07-31",
    });

    expect(view.summary.monitor).toBe(1);
    expect(view.summary.dueSoon).toBe(0);
    expect(view.items[0]).toMatchObject({
      title: "Driver's license renewal",
      verdict: "monitor",
    });
  });
});
