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
        total: "$0.00",
      },
    ]);

    expect(summary.blockCount).toBe(1);
    expect(summary.rows[0]?.tier).toBe("block");
  });

  it("removes a generic visit marker when the actual work is present", () => {
    const summary = tierImportRows([
      {
        shop: "Costco Tire Center",
        shopLocation: "Waltham, MA",
        serviceDate: "2025-01-01",
        mileage: 1000,
        lineItems: ["Service visit", "Tires rotated"],
        total: "$0.00",
      },
    ]);

    expect(summary.autoCount).toBe(1);
    expect(summary.rows[0]?.tier).toBe("auto");
    expect(summary.rows[0]?.service.lineItems).toEqual(["Tires rotated"]);
  });

  it("blocks rows missing shop name", () => {
    const summary = tierImportRows([
      {
        shop: "",
        serviceDate: "2025-01-01",
        mileage: 1000,
        lineItems: ["Inspection"],
        total: "$0.00",
      },
    ]);

    expect(summary.blockCount).toBe(1);
  });
});
