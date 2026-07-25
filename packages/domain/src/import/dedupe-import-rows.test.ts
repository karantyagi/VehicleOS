import { describe, expect, it } from "vitest";
import {
  filterNewImportServices,
  isDuplicateServiceRow,
  serviceRowFingerprint,
  serviceVisitFingerprint,
} from "./dedupe-import-rows.js";
import type { ServiceTimelineEntry } from "../projections/types.js";

const timelineRow = (overrides: Partial<ServiceTimelineEntry>): ServiceTimelineEntry => ({
  serviceId: "svc-1",
  shop: "MetroWest Acura",
  shopLocation: "Framingham, MA",
  serviceDate: "2025-06-11",
  mileage: 44_590,
  lineItems: ["Oil changed"],
  total: "$0.00",
  evidenceIds: [],
  source: "carfax_import",
  ...overrides,
});

describe("dedupe-import-rows", () => {
  it("matches visits by date and shop, not mileage", () => {
    const existing = [timelineRow({ mileage: 44_590 })];
    const incoming = {
      shop: "MetroWest Acura",
      serviceDate: "2025-06-11",
      mileage: 44_567,
      lineItems: ["Inspection"],
      total: "$0.00",
    };

    expect(isDuplicateServiceRow(existing, incoming)).toBe(true);
    expect(serviceVisitFingerprint(incoming)).toBe(serviceVisitFingerprint(existing[0]!));
    expect(serviceRowFingerprint(incoming)).not.toBe(serviceRowFingerprint(existing[0]!));
  });

  it("skips re-import when owner corrected mileage on timeline", () => {
    const result = filterNewImportServices(
      [timelineRow({ mileage: 50_100 })],
      [
        {
          shop: "MetroWest Acura",
          serviceDate: "2025-06-11",
          mileage: 50_000,
          lineItems: ["Tires rotated"],
          total: "$0.00",
        },
      ],
    );

    expect(result.newRows).toHaveLength(0);
    expect(result.skippedCount).toBe(1);
  });

  it("treats different shops on the same day as separate visits", () => {
    const result = filterNewImportServices(
      [timelineRow({ shop: "Ira Acura", mileage: 44_590 })],
      [
        {
          shop: "MetroWest Acura",
          serviceDate: "2025-06-11",
          mileage: 44_567,
          lineItems: ["Inspection"],
          total: "$0.00",
        },
      ],
    );

    expect(result.newRows).toHaveLength(1);
    expect(result.skippedCount).toBe(0);
  });

  it("dedupes duplicate visits within the same import batch", () => {
    const result = filterNewImportServices([], [
      {
        shop: "Costco Tire Center",
        serviceDate: "2025-06-01",
        mileage: 44_000,
        lineItems: ["Tires"],
        total: "$0.00",
      },
      {
        shop: "Costco Tire Center",
        serviceDate: "2025-06-01",
        mileage: 44_050,
        lineItems: ["Balance"],
        total: "$0.00",
      },
    ]);

    expect(result.newRows).toHaveLength(1);
    expect(result.skippedCount).toBe(1);
  });
});
