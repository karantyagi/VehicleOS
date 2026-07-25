import { describe, expect, it } from "vitest";
import { createShopLocationLookupService } from "./shop-location-lookup-service.js";

describe("createShopLocationLookupService", () => {
  it("returns stub results when provider is stub", async () => {
    const lookup = createShopLocationLookupService({ provider: "stub" });
    const result = await lookup.lookupShopLocation({ shop: "Unknown Shop" });
    expect(result.status).toBe("not_initialized");
  });

  it("rate-limits nominatim lookups", async () => {
    const timestamps: number[] = [];
    const lookup = createShopLocationLookupService({
      provider: "nominatim",
      minIntervalMs: 50,
      fetchImpl: async () => {
        timestamps.push(Date.now());
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    });

    await Promise.all([
      lookup.lookupShopLocation({ shop: "Shop A" }),
      lookup.lookupShopLocation({ shop: "Shop B" }),
    ]);

    expect(timestamps).toHaveLength(2);
    expect(timestamps[1]! - timestamps[0]!).toBeGreaterThanOrEqual(45);
  });
});
