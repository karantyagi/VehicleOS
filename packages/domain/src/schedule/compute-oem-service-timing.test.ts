import { describe, expect, it } from "vitest";
import type { ServiceTimelineEntry } from "../projections/types.js";
import { computeOemServiceTiming } from "./compute-oem-service-timing.js";

const row = (overrides: Partial<ServiceTimelineEntry>): ServiceTimelineEntry => ({
  serviceId: "svc-1",
  shop: "Dealer",
  serviceDate: "2026-01-12",
  mileage: 41_800,
  lineItems: ["Oil and filter changed"],
  total: "$0.00",
  evidenceIds: [],
  source: "carfax_import",
  ...overrides,
});

describe("computeOemServiceTiming", () => {
  it("returns on_time when performed within tolerance of OEM interval", () => {
    expect(
      computeOemServiceTiming({
        matches: [row({ serviceDate: "2024-03-01" }), row({ serviceDate: "2024-08-28" })],
        intervalMonths: 6,
        ownedSince: "2021-03-01",
      }),
    ).toBe("on_time");
  });

  it("returns early when performed before OEM interval", () => {
    expect(
      computeOemServiceTiming({
        matches: [row({ serviceDate: "2024-03-01" }), row({ serviceDate: "2024-07-01" })],
        intervalMonths: 6,
        ownedSince: "2021-03-01",
      }),
    ).toBe("early");
  });

  it("returns late when performed after OEM interval plus tolerance", () => {
    expect(
      computeOemServiceTiming({
        matches: [row({ serviceDate: "2024-03-01" }), row({ serviceDate: "2024-10-15" })],
        intervalMonths: 6,
        ownedSince: "2021-03-01",
      }),
    ).toBe("late");
  });

  it("uses ownedSince anchor for first matched service", () => {
    expect(
      computeOemServiceTiming({
        matches: [row({ serviceDate: "2024-07-05" })],
        intervalMonths: 6,
        ownedSince: "2024-01-01",
      }),
    ).toBe("on_time");
  });

  it("returns unknown without interval months or matches", () => {
    expect(
      computeOemServiceTiming({
        matches: [],
        intervalMonths: 6,
        ownedSince: "2024-01-01",
      }),
    ).toBe("unknown");
  });
});
