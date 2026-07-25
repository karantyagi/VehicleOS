import { describe, expect, it } from "vitest";
import { findLastMatchingService, serviceNamePattern } from "./match-service-name.js";
import type { ServiceTimelineEntry } from "../projections/types.js";

const timelineRow = (overrides: Partial<ServiceTimelineEntry>): ServiceTimelineEntry => ({
  serviceId: "svc-1",
  shop: "Dealer",
  serviceDate: "2026-05-13",
  mileage: 57_160,
  lineItems: ["Oil and filter changed"],
  total: "$0.00",
  evidenceIds: [],
  source: "carfax_import",
  ...overrides,
});

describe("match-service-name", () => {
  it("matches CARFAX oil and filter changed to OEM oil service names", () => {
    const timeline = [timelineRow({})];
    const oemName = "Replace engine oil and filter (Maintenance Minder B)";

    expect(serviceNamePattern(oemName).test("Oil and filter changed")).toBe(true);
    expect(findLastMatchingService(timeline, oemName)?.mileage).toBe(57_160);
  });

  it("matches oil & filter shorthand", () => {
    expect(serviceNamePattern("Engine oil & filter").test("Oil & filter replaced")).toBe(true);
  });
});
