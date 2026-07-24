import { describe, expect, it } from "vitest";
import {
  filterNewImportServices,
  filterNewOwnershipRecords,
  isDuplicateServiceRow,
  serviceRowFingerprint,
} from "./dedupe-import-rows.js";

describe("dedupe-import-rows", () => {
  it("skips CARFAX services already on the timeline", () => {
    const existing = [
      {
        serviceId: "s1",
        shop: "Jiffy Lube",
        serviceDate: "2024-06-01",
        mileage: 30_000,
        lineItems: ["Oil change"],
        total: "$62",
        evidenceIds: [],
        source: "carfax_import" as const,
      },
    ];

    const { newRows, skippedCount } = filterNewImportServices(existing, [
      {
        shop: "Jiffy Lube",
        serviceDate: "2024-06-01",
        mileage: 30_000,
        lineItems: ["Oil change (synthetic)"],
        total: "$62.00",
      },
      {
        shop: "Dealer",
        serviceDate: "2026-01-12",
        mileage: 41_800,
        lineItems: ["Oil change"],
        total: "$67.42",
      },
    ]);

    expect(skippedCount).toBe(1);
    expect(newRows).toHaveLength(1);
    expect(newRows[0]?.shop).toBe("Dealer");
  });

  it("skips RMV ownership rows already recorded", () => {
    const existing = [
      {
        recordId: "r1",
        agency: "Massachusetts RMV (myRMV)",
        recordDate: "2026-01-21",
        mileage: null,
        eventType: "title" as const,
        description: "Title active — CM185996",
        details: ["Title Number: CM185996"],
        source: "rmv_import" as const,
      },
    ];

    const { newRows, skippedCount } = filterNewOwnershipRecords(existing, [
      {
        agency: "Massachusetts RMV (myRMV)",
        recordDate: "2026-01-21",
        mileage: null,
        eventType: "title",
        description: "Title active — CM185996",
        details: ["Title Number: CM185996"],
      },
      {
        agency: "Massachusetts RMV (myRMV)",
        recordDate: "2024-10-01",
        mileage: null,
        eventType: "registration",
        description: "Registration active — plate 3KXT69",
        details: ["Plate: 3KXT69"],
      },
    ]);

    expect(skippedCount).toBe(1);
    expect(newRows).toHaveLength(1);
    expect(newRows[0]?.eventType).toBe("registration");
  });

  it("normalizes shop casing for service fingerprints", () => {
    expect(serviceRowFingerprint({ serviceDate: "2024-06-01", mileage: 1, shop: "Jiffy Lube" })).toBe(
      serviceRowFingerprint({ serviceDate: "2024-06-01", mileage: 1, shop: "jiffy lube" }),
    );
  });

  it("detects duplicate service rows for receipt confirm path", () => {
    const timeline = [
      {
        serviceId: "s1",
        shop: "Dealer",
        serviceDate: "2026-01-12",
        mileage: 41_800,
        lineItems: ["Oil change"],
        total: "$67",
        evidenceIds: [],
        source: "receipt" as const,
      },
    ];

    expect(
      isDuplicateServiceRow(timeline, {
        shop: "Dealer",
        serviceDate: "2026-01-12",
        mileage: 41_800,
      }),
    ).toBe(true);
  });
});
