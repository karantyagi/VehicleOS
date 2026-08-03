import { describe, expect, it, vi } from "vitest";
import type { ShopLocationLookupPort } from "@vehicleos/domain";
import {
  GEOAPIFY_DEPLOYMENT_CANARY,
  handleGeoapifyDeploymentSmoke,
  isAuthorizedDeploymentSmokeRequest,
} from "./deployment-geoapify-smoke.js";

const resolvedLookup = (): ShopLocationLookupPort => ({
  lookupShopLocation: async () => ({
    status: "resolved",
    shop: GEOAPIFY_DEPLOYMENT_CANARY.shop,
    shopLocation: "Boston, MA",
    source: "geoapify",
  }),
});

describe("isAuthorizedDeploymentSmokeRequest", () => {
  it("accepts only the configured bearer token", () => {
    expect(isAuthorizedDeploymentSmokeRequest("Bearer expected-token", "expected-token")).toBe(true);
    expect(isAuthorizedDeploymentSmokeRequest("Bearer wrong-token", "expected-token")).toBe(false);
    expect(isAuthorizedDeploymentSmokeRequest(null, "expected-token")).toBe(false);
    expect(isAuthorizedDeploymentSmokeRequest("Bearer expected-token", undefined)).toBe(false);
  });
});

describe("handleGeoapifyDeploymentSmoke", () => {
  it("hides the endpoint and skips lookup without its bearer token", async () => {
    const lookup = resolvedLookup();
    const lookupSpy = vi.spyOn(lookup, "lookupShopLocation");

    await expect(
      handleGeoapifyDeploymentSmoke(null, { deploymentSmokeToken: "expected-token", lookup }),
    ).resolves.toEqual({ status: 404, body: { error: "Not found" } });
    expect(lookupSpy).not.toHaveBeenCalled();
  });

  it("proves a resolved result came from Geoapify without returning location data", async () => {
    const lookup = resolvedLookup();
    const lookupSpy = vi.spyOn(lookup, "lookupShopLocation");

    await expect(
      handleGeoapifyDeploymentSmoke("Bearer expected-token", {
        deploymentSmokeToken: "expected-token",
        lookup,
      }),
    ).resolves.toEqual({ status: 200, body: { status: "ok", integration: "geoapify" } });
    expect(lookupSpy).toHaveBeenCalledWith(GEOAPIFY_DEPLOYMENT_CANARY);
  });

  it("reports a deployment misconfiguration without pretending the lookup is healthy", async () => {
    const lookup: ShopLocationLookupPort = {
      lookupShopLocation: async () => ({
        status: "not_initialized",
        shop: GEOAPIFY_DEPLOYMENT_CANARY.shop,
        message: "Configure GEOAPIFY_API_KEY to enable shop location lookup.",
      }),
    };

    await expect(
      handleGeoapifyDeploymentSmoke("Bearer expected-token", {
        deploymentSmokeToken: "expected-token",
        lookup,
      }),
    ).resolves.toEqual({
      status: 503,
      body: {
        status: "unavailable",
        integration: "geoapify",
        code: "geoapify_not_configured",
      },
    });
  });
});
