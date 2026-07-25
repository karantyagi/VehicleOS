import { describe, expect, it } from "vitest";
import {
  enrichVehicleOsImportServiceWithLookup,
  enrichVehicleOsImportWithLookup,
} from "./enrich-vehicleos-import-with-lookup.js";
import type { ShopLocationLookupPort } from "./lookup-shop-location-port.js";

const resolvedLookup = (shopLocation: string): ShopLocationLookupPort => ({
  lookupShopLocation: async ({ shop }) => ({
    status: "resolved",
    shop,
    shopLocation,
    source: "nominatim",
  }),
});

describe("enrichVehicleOsImportServiceWithLookup", () => {
  it("uses owner memory before lookup", async () => {
    const lookupCalls: string[] = [];
    const lookupPort: ShopLocationLookupPort = {
      lookupShopLocation: async ({ shop }) => {
        lookupCalls.push(shop);
        return { status: "not_found", shop, message: "miss" };
      },
    };

    const enriched = await enrichVehicleOsImportServiceWithLookup(
      {
        shop: "Joe's Garage",
        serviceDate: "2025-01-01",
        mileage: 1000,
        lineItems: ["Oil changed"],
      },
      {
        ownerShopLocations: { "joe's garage": "Cambridge, MA" },
        lookupPort,
      },
    );

    expect(enriched.shopLocation).toBe("Cambridge, MA");
    expect(lookupCalls).toHaveLength(0);
  });

  it("dedupes lookup calls for repeated shop names in batch cache", async () => {
    let callCount = 0;
    const lookupPort = resolvedLookup("Denver, CO");
    const wrapped: ShopLocationLookupPort = {
      lookupShopLocation: async (input) => {
        callCount += 1;
        return lookupPort.lookupShopLocation(input);
      },
    };

    const cache = new Map();
    await enrichVehicleOsImportServiceWithLookup(
      {
        shop: "Mystery Motors",
        serviceDate: "2025-01-01",
        mileage: 1000,
        lineItems: ["Inspection"],
      },
      { lookupPort: wrapped },
      cache,
    );
    await enrichVehicleOsImportServiceWithLookup(
      {
        shop: "Mystery Motors",
        serviceDate: "2025-02-01",
        mileage: 2000,
        lineItems: ["Oil changed"],
      },
      { lookupPort: wrapped },
      cache,
    );

    expect(callCount).toBe(1);
  });

  it("returns base service when lookup does not resolve", async () => {
    const enriched = await enrichVehicleOsImportServiceWithLookup(
      {
        shop: "Mystery Shop",
        serviceDate: "2025-01-01",
        mileage: 1000,
        lineItems: ["Inspection"],
      },
      {
        lookupPort: {
          lookupShopLocation: async ({ shop }) => ({
            status: "not_found",
            shop,
            message: "miss",
          }),
        },
      },
    );

    expect(enriched.shopLocation).toBeUndefined();
  });

  it("skips lookup for self-reported shops", async () => {
    let callCount = 0;
    const enriched = await enrichVehicleOsImportServiceWithLookup(
      {
        shop: "Self reported",
        serviceDate: "2025-01-01",
        mileage: 1000,
        lineItems: ["Oil changed"],
      },
      {
        lookupPort: {
          lookupShopLocation: async ({ shop }) => {
            callCount += 1;
            return { status: "not_found", shop, message: "miss" };
          },
        },
      },
    );

    expect(enriched.shopLocation).toBe("Owner reported");
    expect(callCount).toBe(0);
  });
});

describe("enrichVehicleOsImportWithLookup", () => {
  it("enriches all services sequentially", async () => {
    const enriched = await enrichVehicleOsImportWithLookup(
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
            shop: "Unknown Shop 1",
            serviceDate: "2025-01-01",
            mileage: 1000,
            lineItems: ["Inspection"],
          },
          {
            shop: "Costco Tire Center",
            serviceDate: "2025-02-01",
            mileage: 2000,
            lineItems: ["Tires rotated"],
          },
        ],
      },
      { lookupPort: resolvedLookup("Somewhere, CO") },
    );

    expect(enriched.services[0]?.shopLocation).toBe("Somewhere, CO");
    expect(enriched.services[1]?.shopLocation).toBe("Waltham, MA");
  });
});
