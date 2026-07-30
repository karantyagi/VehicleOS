import { describe, expect, it } from "vitest";
import { mergeShopLocationsFromImport } from "./merge-shop-locations-from-import.js";

describe("mergeShopLocationsFromImport", () => {
  it("adds shop locations from imported services", () => {
    const merged = mergeShopLocationsFromImport(undefined, [
      {
        shop: "Costco Tire Center",
        shopLocation: "Waltham, MA",
        serviceDate: "2026-07-15",
        mileage: 58819,
        lineItems: ["Tires rotated"],
        total: "$0.00",
      },
    ]);

    expect(merged["costco tire center"]).toBe("Waltham, MA");
  });

  it("preserves existing memory and overlays new shops", () => {
    const merged = mergeShopLocationsFromImport(
      { "ira acura westwood": "Westwood, MA" },
      [
        {
          shop: "MetroWest Acura",
          shopLocation: "Framingham, MA",
          serviceDate: "2025-01-01",
          mileage: 40000,
          lineItems: ["Oil changed"],
          total: "$0.00",
        },
      ],
    );

    expect(merged["ira acura westwood"]).toBe("Westwood, MA");
    expect(merged["metrowest acura"]).toBe("Framingham, MA");
  });

  it("skips rows without shop location", () => {
    const merged = mergeShopLocationsFromImport({ "costco tire center": "Waltham, MA" }, [
      {
        shop: "Unknown Shop",
        serviceDate: "2025-01-01",
        mileage: 1000,
        lineItems: ["Inspection"],
        total: "$0.00",
      },
    ]);

    expect(merged).toEqual({ "costco tire center": "Waltham, MA" });
  });
});
