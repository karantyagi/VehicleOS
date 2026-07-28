import { describe, expect, it } from "vitest";
import {
  abbreviateUsState,
  buildNominatimSearchQuery,
  buildNominatimSearchUrl,
  createNominatimShopLocationLookup,
  formatNominatimAddress,
  parseNominatimSearchResponse,
  type NominatimSearchResult,
} from "./nominatim-shop-location.js";

describe("abbreviateUsState", () => {
  it("abbreviates full state names", () => {
    expect(abbreviateUsState("Massachusetts")).toBe("MA");
    expect(abbreviateUsState("ma")).toBe("MA");
  });
});

describe("buildNominatimSearchQuery", () => {
  it("includes hint city when provided", () => {
    expect(buildNominatimSearchQuery({ shop: "MetroWest Acura", hintCity: "Boston" })).toBe(
      "MetroWest Acura, Boston, USA",
    );
  });

  it("defaults to USA scope", () => {
    expect(buildNominatimSearchQuery({ shop: "Costco Tire Center" })).toBe("Costco Tire Center, USA");
  });
});

describe("buildNominatimSearchUrl", () => {
  it("builds a search URL with required params", () => {
    const url = new URL(buildNominatimSearchUrl({ shop: "Ira Acura Westwood", hintCity: "Boston" }));
    expect(url.hostname).toContain("nominatim");
    expect(url.searchParams.get("countrycodes")).toBe("us");
    expect(url.searchParams.get("format")).toBe("json");
  });
});

describe("formatNominatimAddress", () => {
  it("prefers city over town", () => {
    expect(formatNominatimAddress({ city: "Framingham", state: "Massachusetts" })).toBe("Framingham, MA");
  });

  it("uses town when city is absent", () => {
    expect(formatNominatimAddress({ town: "Westwood", state: "Massachusetts" })).toBe("Westwood, MA");
  });
});

describe("parseNominatimSearchResponse", () => {
  const singleMatch: NominatimSearchResult[] = [
    {
      place_id: 123,
      display_name: "MetroWest Acura, Framingham, MA",
      address: { city: "Framingham", state: "Massachusetts", country_code: "us" },
    },
  ];

  it("returns resolved for a single city/state match", () => {
    const result = parseNominatimSearchResponse("MetroWest Acura", singleMatch);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.shopLocation).toBe("Framingham, MA");
      expect(result.source).toBe("nominatim");
      expect(result.placeId).toBe("123");
    }
  });

  it("returns not_found when results are empty", () => {
    const result = parseNominatimSearchResponse("Unknown Shop", []);
    expect(result.status).toBe("not_found");
  });

  it("returns ambiguous when multiple distinct locations match", () => {
    const result = parseNominatimSearchResponse("Acura Dealer", [
      {
        place_id: 1,
        display_name: "A",
        address: { city: "Framingham", state: "Massachusetts" },
      },
      {
        place_id: 2,
        display_name: "B",
        address: { city: "Westwood", state: "Massachusetts" },
      },
    ]);

    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") {
      expect(result.candidates).toEqual(["Framingham, MA", "Westwood, MA"]);
    }
  });
  it("returns not_found when geocoding lacks city/state", () => {
    const result = parseNominatimSearchResponse("Shop", [
      { place_id: 1, display_name: "Somewhere", address: { country_code: "us" } },
    ]);
    expect(result.status).toBe("not_found");
  });
});

describe("enrichVehicleOsImportServicesWithLookup", () => {
  it("enriches a batch of services", async () => {
    const { enrichVehicleOsImportServicesWithLookup } = await import(
      "./enrich-vehicleos-import-with-lookup.js"
    );
    const enriched = await enrichVehicleOsImportServicesWithLookup(
      [
        {
          shop: "Unknown Shop 9",
          serviceDate: "2025-01-01",
          mileage: 1000,
          lineItems: ["Inspection"],
          total: "$0.00",
        },
      ],
      {
        lookupPort: {
          lookupShopLocation: async ({ shop }) => ({
            status: "resolved",
            shop,
            shopLocation: "Denver, CO",
            source: "nominatim",
          }),
        },
      },
    );

    expect(enriched[0]?.shopLocation).toBe("Denver, CO");
  });
});

describe("createNominatimShopLocationLookup", () => {
  it("calls fetch with user agent and parses JSON", async () => {
    const lookup = createNominatimShopLocationLookup({
      userAgent: "VehicleOS-Test",
      fetch: async () =>
        new Response(
          JSON.stringify([
            {
              place_id: 99,
              display_name: "Costco Tire Center, Waltham, MA",
              address: { city: "Waltham", state: "Massachusetts" },
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    });

    const result = await lookup.lookupShopLocation({ shop: "Costco Tire Center" });
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.shopLocation).toBe("Waltham, MA");
    }
  });

  it("returns not_found on HTTP error", async () => {
    const lookup = createNominatimShopLocationLookup({
      userAgent: "VehicleOS-Test",
      fetch: async () => new Response("error", { status: 503 }),
    });

    const result = await lookup.lookupShopLocation({ shop: "Unknown Shop" });
    expect(result.status).toBe("not_found");
  });
});
