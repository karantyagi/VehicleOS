import { describe, expect, it } from "vitest";
import { createShopLocationLookupService } from "./shop-location-lookup-service.js";

describe("createShopLocationLookupService", () => {
  it("returns stub results when provider is stub", async () => {
    const lookup = createShopLocationLookupService({ provider: "stub" });
    const result = await lookup.lookupShopLocation({ shop: "Unknown Shop" });
    expect(result.status).toBe("not_initialized");
  });

  it("uses Geoapify when its server-only key is configured", async () => {
    const lookup = createShopLocationLookupService({
      provider: "geoapify",
      apiKey: "test-key",
      fetchImpl: async () => {
        return new Response(JSON.stringify({ features: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    });

    const result = await lookup.lookupShopLocation({ shop: "Shop A" });
    expect(result.status).toBe("not_found");
  });
});
