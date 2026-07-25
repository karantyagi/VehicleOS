import { describe, expect, it } from "vitest";
import { tierImportRows } from "./tier-import-rows.js";
import type { VehicleOsImportService } from "./record-vehicleos-import.js";

const service = (overrides: Partial<VehicleOsImportService>): VehicleOsImportService => ({
  shop: "MetroWest Acura",
  shopLocation: "Framingham, MA",
  serviceDate: "2026-05-13",
  mileage: 57160,
  lineItems: ["Oil and filter changed"],
  total: "$0.00",
  ...overrides,
});

describe("tierImportRows", () => {
  it("marks clean rows as auto", () => {
    const summary = tierImportRows([service({})]);
    expect(summary.autoCount).toBe(1);
    expect(summary.verifyCount).toBe(0);
  });

  it("marks missing dealer location as verify", () => {
    const summary = tierImportRows([service({ shopLocation: undefined })]);
    expect(summary.verifyCount).toBe(1);
    expect(summary.rows[0]?.reasons[0]).toContain("Shop location missing");
  });

  it("allows self-reported rows without location", () => {
    const summary = tierImportRows([
      service({ shop: "Self Reported", shopLocation: undefined }),
    ]);
    expect(summary.autoCount).toBe(1);
  });

  it("flags mileage regression within import batch", () => {
    const summary = tierImportRows([
      service({ serviceDate: "2026-01-01", mileage: 50_000 }),
      service({ serviceDate: "2026-06-01", mileage: 49_000 }),
    ]);
    expect(summary.verifyCount).toBe(1);
  });

  it("blocks invalid rows", () => {
    const summary = tierImportRows([service({ serviceDate: "bad-date" })]);
    expect(summary.blockCount).toBe(1);
  });
});
