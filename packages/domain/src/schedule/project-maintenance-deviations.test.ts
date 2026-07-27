import { describe, expect, it } from "vitest";
import type { ScheduleProjectionRow } from "./project-maintenance-schedule.js";
import { projectMaintenanceDeviations } from "./project-maintenance-deviations.js";

const row = (overrides: Partial<ScheduleProjectionRow>): ScheduleProjectionRow => ({
  entryId: "brake-pads-rear",
  serviceName: "Brake pads, rear",
  systemGroup: "Brakes",
  dueDate: "2027-01-01",
  dueMileage: 45_000,
  status: "upcoming",
  serviceBaseline: {
    performedDate: "2024-06-01",
    performedMileage: 30_000,
    baselineSource: "carfax",
  },
  oemInterval: { months: 48, miles: null },
  oemSource: { manualTitle: "Manual", page: null, ruleId: "rule-1" },
  dueDateConfidence: "oem_calendar",
  isStubSchedule: false,
  oemTiming: "early",
  overdueWithoutHistory: false,
  ...overrides,
});

describe("projectMaintenanceDeviations", () => {
  it("returns early/late rows only", () => {
    const deviations = projectMaintenanceDeviations({
      scheduleRows: [
        row({ oemTiming: "early" }),
        row({ entryId: "engine-oil", oemTiming: "on_time" }),
        row({ entryId: "tire-rotation", oemTiming: "late" }),
      ],
    });

    expect(deviations).toHaveLength(2);
    expect(deviations.map((item) => item.entryId)).toEqual(["brake-pads-rear", "tire-rotation"]);
  });

  it("marks confirmed patterns from owner memory", () => {
    const deviations = projectMaintenanceDeviations({
      scheduleRows: [row({ oemTiming: "early" })],
      ownerContextMemory: {
        maintenancePatterns: {
          "brake-pads-rear": {
            timing: "early",
            reason: "Winter road salt / corrosion",
            confirmedAt: "2026-07-27T00:00:00.000Z",
          },
        },
      },
    });

    expect(deviations[0]?.hasConfirmedPattern).toBe(true);
    expect(deviations[0]?.confirmedPattern?.reason).toBe("Winter road salt / corrosion");
  });
});
