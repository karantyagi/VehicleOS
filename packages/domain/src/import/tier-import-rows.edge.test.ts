import { describe, expect, it } from "vitest";
import { tierImportRows } from "./tier-import-rows.js";

describe("tierImportRows edge cases", () => {
  it("blocks rows with invalid mileage", () => {
    const summary = tierImportRows([
      {
        shop: "Costco Tire Center",
        shopLocation: "Waltham, MA",
        serviceDate: "2025-01-01",
        mileage: Number.NaN,
        lineItems: ["Tires rotated"],
      },
    ]);

    expect(summary.blockCount).toBe(1);
    expect(summary.rows[0]?.tier).toBe("block");
  });

  it("marks enriched when only boilerplate was stripped", () => {
    const summary = tierImportRows([
      {
        shop: "Costco Tire Center",
        shopLocation: "Waltham, MA",
        serviceDate: "2025-01-01",
        mileage: 1000,
        lineItems: ["Service visit", "Tires rotated"],
      },
    ]);

    expect(summary.enrichedCount).toBe(1);
    expect(summary.rows[0]?.tier).toBe("enriched");
  });

  it("blocks rows missing shop name", () => {
    const summary = tierImportRows([
      {
        shop: "",
        serviceDate: "2025-01-01",
        mileage: 1000,
        lineItems: ["Inspection"],
      },
    ]);

    expect(summary.blockCount).toBe(1);
  });
});
