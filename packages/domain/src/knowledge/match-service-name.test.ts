import { describe, expect, it } from "vitest";
import {
  findLastMatchingService,
  findMatchingServices,
  serviceNamePattern,
} from "./match-service-name.js";
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

  it("matches rear brake pads to rear brake OEM rows", () => {
    const timeline = [
      timelineRow({
        serviceDate: "2026-03-10",
        lineItems: ["Rear brake pads replaced"],
      }),
    ];
    expect(findMatchingServices(timeline, "Rear brake pads").length).toBe(1);
    expect(findMatchingServices(timeline, "Front brake pads").length).toBe(0);
  });

  it("returns chronologically last match", () => {
    const timeline = [
      timelineRow({ serviceId: "a", serviceDate: "2024-01-01", lineItems: ["Oil and filter changed"] }),
      timelineRow({ serviceId: "b", serviceDate: "2025-06-01", lineItems: ["Oil and filter changed"] }),
    ];
    expect(findLastMatchingService(timeline, "Engine oil & filter")?.serviceId).toBe("b");
  });
});
