import { describe, expect, it } from "vitest";
import { enrichVehicleOsImport } from "./enrich-vehicleos-import.js";

describe("enrichVehicleOsImport", () => {
  it("fills shop location and normalizes line items on JSON import path", () => {
    const enriched = enrichVehicleOsImport({
      version: "1",
      source: "carfax-pdf-manual",
      exportedAt: "2026-07-24T16:00:00.000Z",
      vehicle: {
        vin: "19UUB6F47MA008400",
        year: 2021,
        make: "Acura",
        model: "TLX",
        currentMileage: 58819,
      },
      services: [
        {
          shop: "Costco Tire Center",
          serviceDate: "2026-07-15",
          mileage: 58819,
          lineItems: ["Vehicle serviced", "Tires rotated"],
          total: "$0.00",
        },
      ],
    });

    expect(enriched.services[0]?.shopLocation).toBe("Waltham, MA");
    expect(enriched.services[0]?.lineItems).toEqual(["Tires rotated"]);
  });

  it("uses owner shop memory when pack misses", () => {
    const enriched = enrichVehicleOsImport(
      {
        version: "1",
        source: "carfax-json",
        exportedAt: "2026-07-24T16:00:00.000Z",
        vehicle: {
          vin: "19UUB6F47MA008400",
          year: 2021,
          make: "Acura",
          model: "TLX",
          currentMileage: 58819,
        },
        services: [
          {
            shop: "Joe's Garage",
            serviceDate: "2026-07-15",
            mileage: 58819,
            lineItems: ["Oil changed"],
            total: "$0.00",
          },
        ],
      },
      { ownerShopLocations: { "joe's garage": "Cambridge, MA" } },
    );

    expect(enriched.services[0]?.shopLocation).toBe("Cambridge, MA");
  });
});
