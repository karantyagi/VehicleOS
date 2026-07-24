import { describe, expect, it } from "vitest";
import type { ServiceTimelineEntry } from "../projections/types.js";
import {
  AGGRESSIVE_DUE_SOON_DAYS,
  computeEffectiveMilesPerYear,
  computeObservedMilesPerYear,
  resolveDueSoonDays,
  resolveScheduleProjectionContext,
} from "./resolve-schedule-projection-context.js";
import { DEFAULT_DUE_SOON_DAYS, DEFAULT_EFFECTIVE_MILES_PER_YEAR } from "./project-maintenance-schedule.js";

const timelineRow = (overrides: Partial<ServiceTimelineEntry>): ServiceTimelineEntry => ({
  serviceId: "svc-1",
  shop: "Dealer",
  serviceDate: "2026-01-12",
  mileage: 41_800,
  lineItems: ["Oil change"],
  total: "$67.42",
  evidenceIds: ["ev-1"],
  source: "receipt",
  ...overrides,
});

describe("resolveScheduleProjectionContext", () => {
  it("defaults effective miles per year to 10k when no owner override or receipts", () => {
    const context = resolveScheduleProjectionContext({ timeline: [] });

    expect(context.effectiveMilesPerYear).toBe(DEFAULT_EFFECTIVE_MILES_PER_YEAR);
    expect(context.observedMilesPerYear).toBeNull();
    expect(context.dueSoonDays).toBe(DEFAULT_DUE_SOON_DAYS);
  });

  it("uses stated miles when provided", () => {
    const context = resolveScheduleProjectionContext({
      timeline: [],
      statedMilesPerYear: 12_000,
    });

    expect(context.effectiveMilesPerYear).toBe(12_000);
  });

  it("blends observed and stated miles when receipts support a rate", () => {
    const observed = computeObservedMilesPerYear(
      [
        timelineRow({ serviceDate: "2025-01-01", mileage: 30_000 }),
        timelineRow({ serviceDate: "2026-01-01", mileage: 42_000, serviceId: "svc-2" }),
      ],
      "2026-07-23",
    );

    expect(observed).toBe(12_000);
    expect(
      computeEffectiveMilesPerYear({
        statedMilesPerYear: 10_000,
        observedMilesPerYear: observed,
      }),
    ).toBe(11_400);
  });

  it("extends due-soon window for aggressive driving style", () => {
    expect(resolveDueSoonDays("aggressive")).toBe(AGGRESSIVE_DUE_SOON_DAYS);
    expect(resolveDueSoonDays("casual")).toBe(DEFAULT_DUE_SOON_DAYS);
    expect(
      resolveScheduleProjectionContext({
        timeline: [],
        drivingStyle: "aggressive",
      }).dueSoonDays,
    ).toBe(AGGRESSIVE_DUE_SOON_DAYS);
  });
});
