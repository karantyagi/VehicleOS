import { createHash, timingSafeEqual } from "node:crypto";
import type { ShopLocationLookupPort } from "@vehicleos/domain";
import { createShopLocationLookupService } from "@vehicleos/server";

/**
 * A stable, non-owner query used only to prove the deployed server can reach
 * Geoapify with its configured credential. It is intentionally unrelated to
 * an imported visit, vehicle, or account.
 */
export const GEOAPIFY_DEPLOYMENT_CANARY = {
  shop: "Boston City Hall",
  hintCity: "Boston",
} as const;

type DeploymentSmokeBody =
  | { status: "ok"; integration: "geoapify" }
  | {
      status: "unavailable";
      integration: "geoapify";
      code: "geoapify_not_configured" | "geoapify_lookup_unresolved";
    }
  | { error: "Not found" };

export type DeploymentSmokeResponse = {
  status: 200 | 404 | 503;
  body: DeploymentSmokeBody;
};

export type DeploymentSmokeDependencies = {
  lookup?: ShopLocationLookupPort;
  deploymentSmokeToken?: string;
};

const tokenDigest = (value: string): Buffer => createHash("sha256").update(value).digest();

export const isAuthorizedDeploymentSmokeRequest = (
  authorization: string | null,
  deploymentSmokeToken: string | undefined,
): boolean => {
  if (!deploymentSmokeToken || !authorization?.startsWith("Bearer ")) return false;

  const suppliedToken = authorization.slice("Bearer ".length);
  if (!suppliedToken) return false;

  return timingSafeEqual(tokenDigest(suppliedToken), tokenDigest(deploymentSmokeToken));
};

export const runGeoapifyDeploymentSmoke = async (
  lookup: ShopLocationLookupPort,
): Promise<DeploymentSmokeResponse> => {
  const result = await lookup.lookupShopLocation(GEOAPIFY_DEPLOYMENT_CANARY);

  if (result.status === "resolved" && result.source === "geoapify") {
    return { status: 200, body: { status: "ok", integration: "geoapify" } };
  }

  return {
    status: 503,
    body: {
      status: "unavailable",
      integration: "geoapify",
      code: result.status === "not_initialized" ? "geoapify_not_configured" : "geoapify_lookup_unresolved",
    },
  };
};

export const handleGeoapifyDeploymentSmoke = async (
  authorization: string | null,
  dependencies: DeploymentSmokeDependencies = {},
): Promise<DeploymentSmokeResponse> => {
  const deploymentSmokeToken = dependencies.deploymentSmokeToken ?? process.env.DEPLOYMENT_SMOKE_TOKEN;

  if (!isAuthorizedDeploymentSmokeRequest(authorization, deploymentSmokeToken)) {
    return { status: 404, body: { error: "Not found" } };
  }

  return runGeoapifyDeploymentSmoke(
    dependencies.lookup ?? createShopLocationLookupService(),
  );
};
