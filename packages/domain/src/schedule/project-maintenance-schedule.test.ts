import { describe, expect, it } from "vitest";
import type { KnowledgeScheduleEntry, ServiceTimelineEntry } from "../projections/types.js";
import {
  DEFAULT_EFFECTIVE_MILES_PER_YEAR,
  EXTENDED_SCHEDULE_HORIZON_MONTHS,
  projectMaintenanceSchedule,
} from "./project-maintenance-schedule.js";

const entry = (overrides: Partial<KnowledgeScheduleEntry>): KnowledgeScheduleEntry => ({
  entryId: "entry-1",
  serviceName: "Engine oil & filter",
  intervalMiles: 5_000,
  intervalMonths: 6,
  sourceDocumentId: "doc-1",
  manualTitle: "2021 Acura TLX maintenance schedule",
  recordedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const timelineRow = (overrides: Partial<ServiceTimelineEntry>): ServiceTimelineEntry => ({
  serviceId: "svc-1",
  shop: "Dealer",
  serviceDate: "2026-01-12",
  mileage: 41_800,
  lineItems: ["Oil change (synthetic)"],
  total: "$67.42",
  evidenceIds: ["ev-1"],
  source: "receipt",
  ...overrides,
});

describe("projectMaintenanceSchedule", () => {
  it("projects calendar due dates from receipt baseline (time-first)", () => {
    const result = projectMaintenanceSchedule({
      knowledgeSchedule: [entry({})],
      timeline: [timelineRow({})],
      currentMileage: 42_000,
      today: "2026-07-23",
      horizonMonths: 12,
    });

    expect(result.effectiveMilesPerYear).toBe(DEFAULT_EFFECTIVE_MILES_PER_YEAR);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.dueDate).toBe("2026-07-12");
    expect(result.rows[0]?.dueDateConfidence).toBe("oem_calendar");
    expect(result.rows[0]?.status).toBe("overdue");
    expect(result.rows[0]?.dueMileage).toBe(46_800);
  });

  it("converts mileage-only intervals using effective miles per year", () => {
    const result = projectMaintenanceSchedule({
      knowledgeSchedule: [
        entry({
          intervalMonths: undefined,
          intervalMiles: 10_000,
          serviceName: "Tire rotation",
        }),
      ],
      timeline: [timelineRow({ mileage: 30_000, lineItems: ["Tire rotation"] })],
      currentMileage: 35_000,
      today: "2026-07-23",
      horizonMonths: 12,
    });

    expect(result.rows[0]?.dueDateConfidence).toBe("mileage_converted");
    expect(result.rows[0]?.dueDate).toBe("2027-01-22");
    expect(result.rows[0]?.status).toBe("upcoming");
  });

  it("marks rows needing baseline when calendar interval lacks anchor date", () => {
    const result = projectMaintenanceSchedule({
      knowledgeSchedule: [entry({ intervalMiles: undefined, intervalMonths: 36 })],
      timeline: [],
      currentMileage: 12_000,
      today: "2026-07-23",
    });

    expect(result.rows[0]?.status).toBe("needs_baseline");
    expect(result.rows[0]?.dueDate).toBeNull();
    expect(result.rows[0]?.dueDateConfidence).toBe("needs_baseline");
  });

  it("filters rows outside the near horizon unless overdue", () => {
    const result = projectMaintenanceSchedule({
      knowledgeSchedule: [
        entry({
          serviceName: "Brake fluid inspection",
          intervalMiles: 30_000,
          intervalMonths: 36,
        }),
      ],
      timeline: [timelineRow({ serviceDate: "2024-01-01", mileage: 10_000, lineItems: ["Brake fluid"] })],
      currentMileage: 15_000,
      today: "2026-07-23",
      horizonMonths: 3,
    });

    expect(result.rows).toHaveLength(0);

    const extended = projectMaintenanceSchedule({
      knowledgeSchedule: [
        entry({
          serviceName: "Brake fluid inspection",
          intervalMiles: 30_000,
          intervalMonths: 36,
        }),
      ],
      timeline: [timelineRow({ serviceDate: "2024-01-01", mileage: 10_000, lineItems: ["Brake fluid"] })],
      currentMileage: 15_000,
      today: "2026-07-23",
      horizonMonths: EXTENDED_SCHEDULE_HORIZON_MONTHS,
    });

    expect(extended.rows).toHaveLength(1);
    expect(extended.rows[0]?.status).toBe("upcoming");
  });
});
