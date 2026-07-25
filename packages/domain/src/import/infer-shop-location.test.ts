import { describe, expect, it } from "vitest";
import { inferShopLocation, looksLikeShopAddressLine, resolveShopLocation } from "./infer-shop-location.js";

describe("inferShopLocation", () => {
  it("maps known Boston-area shops", () => {
    expect(inferShopLocation("Ira Acura Westwood")).toBe("Westwood, MA");
    expect(inferShopLocation("MetroWest Acura")).toBe("Framingham, MA");
    expect(inferShopLocation("Costco Tire Center")).toBe("Waltham, MA");
  });

  it("prefers explicit location when provided", () => {
    expect(resolveShopLocation({ shop: "Costco Tire Center", shopLocation: "Natick, MA" })).toBe("Natick, MA");
  });
});

describe("looksLikeShopAddressLine", () => {
  it("detects city/state address lines", () => {
    expect(looksLikeShopAddressLine("Waltham, MA")).toBe(true);
    expect(looksLikeShopAddressLine("Date")).toBe(false);
  });
});
