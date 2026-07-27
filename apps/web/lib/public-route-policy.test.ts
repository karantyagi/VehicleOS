import { describe, expect, it } from "vitest";
import { isPublicAppRoute } from "./public-route-policy.js";

describe("isPublicAppRoute", () => {
  it("allows catalog read APIs without auth", () => {
    expect(isPublicAppRoute("/api/catalog/vehicles")).toBe(true);
    expect(isPublicAppRoute("/api/catalog/supported")).toBe(true);
  });

  it("blocks protected owner APIs", () => {
    expect(isPublicAppRoute("/api/vehicles")).toBe(false);
    expect(isPublicAppRoute("/")).toBe(false);
    expect(isPublicAppRoute("/garage")).toBe(false);
  });
});
