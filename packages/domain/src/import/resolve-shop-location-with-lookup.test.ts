import { describe, expect, it } from "vitest";
import { resolveShopLocationWithLookup } from "./resolve-shop-location-with-lookup.js";

describe("resolveShopLocationWithLookup", () => {
  it("returns curated pack location without lookup", async () => {
    const result = await resolveShopLocationWithLookup({
      shop: "Costco Tire Center",
    });

    expect(result.shopLocation).toBe("Waltham, MA");
    expect(result.lookup).toBeUndefined();
  });

  it("returns owner memory before lookup", async () => {
    const result = await resolveShopLocationWithLookup({
      shop: "My Local Shop",
      ownerShopLocations: { "my local shop": "Boston, MA" },
    });

    expect(result.shopLocation).toBe("Boston, MA");
  });

  it("returns stub lookup result on cache miss", async () => {
    const result = await resolveShopLocationWithLookup({
      shop: "Unknown Shop XYZ",
    });

    expect(result.shopLocation).toBeUndefined();
    expect(result.lookup?.status).toBe("not_initialized");
  });
});
