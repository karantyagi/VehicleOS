import { describe, expect, it } from "vitest";
import { tierImportRows, tierNewImportRows } from "./tier-import-rows.js";
import type { VehicleOsImportService } from "./record-vehicleos-import.js";
import type { ServiceTimelineEntry } from "../projections/types.js";

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
    expect(summary.rows[0]?.ownerGuidance[0]?.code).toBe("missing_shop_location");
  });

  it("requires owner confirmation for self-reported maintenance", () => {
    const summary = tierImportRows([
      service({ shop: "Self Reported", shopLocation: undefined }),
    ]);
    expect(summary.verifyCount).toBe(1);
    expect(summary.rows[0]?.ownerGuidance[0]?.code).toBe("owner_reported_service");
  });

  it("requires owner confirmation for DIY maintenance and state inspection entries", () => {
    const summary = tierImportRows([
      service({ shop: "Self-Service (DIY)", shopLocation: undefined }),
      service({
        shop: "Massachusetts",
        shopLocation: "Massachusetts",
        lineItems: ["Passed safety inspection"],
      }),
    ]);

    expect(summary.verifyCount).toBe(2);
    expect(summary.rows[0]?.ownerGuidance[0]?.code).toBe("owner_diy_service");
    expect(summary.rows[1]?.ownerGuidance[0]?.code).toBe("state_inspection_record");
  });

  it("flags meaningful cross-day mileage rollback", () => {
    const summary = tierImportRows([
      service({ serviceDate: "2026-01-01", mileage: 50_000 }),
      service({ serviceDate: "2026-06-01", mileage: 49_000 }),
    ]);
    expect(summary.verifyCount).toBe(1);
    expect(summary.rows[1]?.ownerGuidance[0]?.code).toBe("mileage_cross_day");
  });

  it("does not flag same-day mileage differences", () => {
    const summary = tierImportRows([
      service({ serviceDate: "2025-06-11", mileage: 44_590 }),
      service({ serviceDate: "2025-06-11", mileage: 44_567 }),
    ]);
    expect(summary.verifyCount).toBe(0);
  });

  it("blocks invalid rows", () => {
    const summary = tierImportRows([service({ serviceDate: "bad-date" })]);
    expect(summary.blockCount).toBe(1);
  });
});

const existingTimelineRow = (overrides: Partial<ServiceTimelineEntry>): ServiceTimelineEntry => ({
  serviceId: "svc-existing",
  shop: "MetroWest Acura",
  shopLocation: "Framingham, MA",
  serviceDate: "2026-01-01",
  mileage: 50_000,
  lineItems: ["Prior service"],
  total: "$0.00",
  evidenceIds: [],
  source: "carfax_import",
  ...overrides,
});

describe("tierNewImportRows", () => {
  it("flags cross-day rollback against existing history", () => {
    const summary = tierNewImportRows(
      [existingTimelineRow({})],
      [service({ serviceDate: "2026-06-01", mileage: 49_000 })],
    );

    expect(summary.verifyCount).toBe(1);
    expect(summary.rows[0]?.ownerGuidance[0]?.code).toBe("mileage_cross_day");
  });

  it("does not verify new rows when batch-only tiering would miss history", () => {
    const batchOnly = tierImportRows([service({ serviceDate: "2026-06-01", mileage: 49_000 })]);
    expect(batchOnly.verifyCount).toBe(0);

    const withHistory = tierNewImportRows(
      [existingTimelineRow({})],
      [service({ serviceDate: "2026-06-01", mileage: 49_000 })],
    );
    expect(withHistory.verifyCount).toBe(1);
  });

  it("returns empty summary when there are no new rows", () => {
    const summary = tierNewImportRows([existingTimelineRow({})], []);
    expect(summary.rows).toHaveLength(0);
    expect(summary.verifyCount).toBe(0);
  });
});
