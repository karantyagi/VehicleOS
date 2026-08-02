import { describe, expect, it } from "vitest";
import {
  abbreviateUsState,
  buildGeoapifySearchText,
  buildGeoapifySearchUrl,
  createGeoapifyShopLocationLookup,
  formatGeoapifyLocation,
  parseGeoapifySearchResponse,
  type GeoapifySearchResponse,
} from "./geoapify-shop-location.js";

describe("abbreviateUsState", () => {
  it("abbreviates full state names", () => {
    expect(abbreviateUsState("Massachusetts")).toBe("MA");
    expect(abbreviateUsState("ma")).toBe("MA");
    expect(abbreviateUsState("US-MA")).toBe("MA");
  });
});

describe("buildGeoapifySearchText", () => {
  it("uses the owner city as a helpful query hint", () => {
    expect(buildGeoapifySearchText({ shop: "MetroWest Acura", hintCity: "Boston" })).toBe(
      "MetroWest Acura, Boston, USA",
    );
  });

  it("does not invent a city when none is known", () => {
    expect(buildGeoapifySearchText({ shop: "Costco Tire Center" })).toBe("Costco Tire Center");
  });
});

describe("buildGeoapifySearchUrl", () => {
  it("builds a US-only Geoapify query", () => {
    const url = new URL(
      buildGeoapifySearchUrl({ shop: "Ira Acura Westwood", hintCity: "Boston" }, "test-key"),
    );
    expect(url.hostname).toBe("api.geoapify.com");
    expect(url.searchParams.get("filter")).toBe("countrycode:us");
    expect(url.searchParams.get("format")).toBe("geojson");
    expect(url.searchParams.get("apiKey")).toBe("test-key");
  });
});

describe("formatGeoapifyLocation", () => {
  it("prefers city over town and uses the supplied state code", () => {
    expect(formatGeoapifyLocation({ city: "Framingham", state_code: "MA" })).toBe(
      "Framingham, MA",
    );
  });

  it("uses town and abbreviates a full state name", () => {
    expect(formatGeoapifyLocation({ town: "Westwood", state: "Massachusetts" })).toBe(
      "Westwood, MA",
    );
  });
});

describe("parseGeoapifySearchResponse", () => {
  const singleMatch: GeoapifySearchResponse = {
    features: [
      {
        properties: {
          place_id: "geo-123",
          city: "Framingham",
          state: "Massachusetts",
        },
      },
    ],
  };

  it("returns resolved for one city/state", () => {
    const result = parseGeoapifySearchResponse("MetroWest Acura", singleMatch);
    expect(result).toEqual({
      status: "resolved",
      shop: "MetroWest Acura",
      shopLocation: "Framingham, MA",
      placeId: "geo-123",
      source: "geoapify",
    });
  });

  it("returns not_found when results are empty or unusable", () => {
    expect(parseGeoapifySearchResponse("Unknown Shop", { features: [] }).status).toBe("not_found");
    expect(
      parseGeoapifySearchResponse("Unknown Shop", { features: [{ properties: {} }] }).status,
    ).toBe("not_found");
  });

  it("returns ambiguous for multiple distinct locations", () => {
    const result = parseGeoapifySearchResponse("Acura Dealer", {
      features: [
        { properties: { city: "Framingham", state_code: "MA" } },
        { properties: { city: "Westwood", state_code: "MA" } },
      ],
    });

    expect(result).toEqual({
      status: "ambiguous",
      shop: "Acura Dealer",
      candidates: ["Framingham, MA", "Westwood, MA"],
      message: "Multiple locations found for Acura Dealer. Confirm one or enter manually.",
    });
  });
});

describe("createGeoapifyShopLocationLookup", () => {
  it("does not send a request until an API key is configured", async () => {
    const lookup = createGeoapifyShopLocationLookup({
      fetch: async () => {
        throw new Error("should not fetch");
      },
    });

    const result = await lookup.lookupShopLocation({ shop: "Unknown Shop" });
    expect(result.status).toBe("not_initialized");
  });

  it("calls Geoapify and parses the GeoJSON response", async () => {
    const lookup = createGeoapifyShopLocationLookup({
      apiKey: "test-key",
      fetch: async () =>
        new Response(
          JSON.stringify({
            features: [
              { properties: { place_id: "geo-99", city: "Waltham", state_code: "MA" } },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    });

    const result = await lookup.lookupShopLocation({ shop: "Costco Tire Center" });
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.shopLocation).toBe("Waltham, MA");
      expect(result.source).toBe("geoapify");
    }
  });

  it("keeps manual entry available when the provider is unavailable", async () => {
    const lookup = createGeoapifyShopLocationLookup({
      apiKey: "test-key",
      fetch: async () => new Response("error", { status: 503 }),
    });

    const result = await lookup.lookupShopLocation({ shop: "Unknown Shop" });
    expect(result.status).toBe("not_found");
  });
});
