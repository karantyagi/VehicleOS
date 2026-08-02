import { describe, expect, it } from "vitest";
import { shopLocationHintFromLookup } from "./shop-location-hints.js";
import { enrichVehicleOsImportWithLookupAndHints } from "./enrich-vehicleos-import-with-lookup.js";

describe("shopLocationHintFromLookup", () => {
  it("maps ambiguous lookup to candidates", () => {
    const hint = shopLocationHintFromLookup("Acura Dealer", {
      status: "ambiguous",
      shop: "Acura Dealer",
      candidates: ["Framingham, MA", "Westwood, MA"],
      message: "Multiple matches",
    });

    expect(hint).toEqual({
      shop: "Acura Dealer",
      status: "ambiguous",
      candidates: ["Framingham, MA", "Westwood, MA"],
      message: "Multiple matches",
    });
  });

  it("returns undefined for resolved lookup", () => {
    expect(
      shopLocationHintFromLookup("Costco", {
        status: "resolved",
        shop: "Costco",
        shopLocation: "Waltham, MA",
        source: "geoapify",
      }),
    ).toBeUndefined();
  });
});

describe("enrichVehicleOsImportWithLookupAndHints", () => {
  it("returns ambiguous hints without auto-filling location", async () => {
    const result = await enrichVehicleOsImportWithLookupAndHints(
      {
        version: "1",
        source: "test",
        exportedAt: "2026-01-01T00:00:00.000Z",
        vehicle: {
          vin: "1",
          year: 2021,
          make: "Acura",
          model: "TLX",
          currentMileage: 1000,
        },
        services: [
          {
            shop: "Acura Dealer",
            serviceDate: "2025-01-01",
            mileage: 1000,
            lineItems: ["Inspection"],
            total: "$0.00",
          },
        ],
      },
      {
        lookupPort: {
          lookupShopLocation: async ({ shop }) => ({
            status: "ambiguous",
            shop,
            candidates: ["Framingham, MA", "Westwood, MA"],
            message: "Multiple matches",
          }),
        },
      },
    );

    expect(result.draft.services[0]?.shopLocation).toBeUndefined();
    expect(result.shopLocationHints["acura dealer"]?.candidates).toEqual([
      "Framingham, MA",
      "Westwood, MA",
    ]);
  });
});
