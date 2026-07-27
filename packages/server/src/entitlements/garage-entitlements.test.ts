import { afterEach, describe, expect, it } from "vitest";
import {
  FREE_GARAGE_VEHICLE_LIMIT,
  buildGarageEntitlements,
  resolveGarageTier,
} from "./garage-entitlements.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("garage entitlements", () => {
  it("free tier allows two vehicles then blocks", () => {
    const one = buildGarageEntitlements({ userId: "user-1", vehicleCount: 1 });
    expect(one.canAddVehicle).toBe(true);
    expect(one.vehicleLimit).toBe(FREE_GARAGE_VEHICLE_LIMIT);

    const two = buildGarageEntitlements({ userId: "user-1", vehicleCount: 2 });
    expect(two.canAddVehicle).toBe(false);
    expect(two.upgradeRequired).toBe(true);
    expect(two.upgradeMessage).toMatch(/Pro\/Premium/);
  });

  it("team tier is unlimited via user id env", () => {
    process.env.VEHICLEOS_TEAM_USER_IDS = "team-user";
    const tier = resolveGarageTier({ userId: "team-user" });
    expect(tier).toBe("team");

    const entitlements = buildGarageEntitlements({ userId: "team-user", vehicleCount: 12 });
    expect(entitlements.canAddVehicle).toBe(true);
    expect(entitlements.vehicleLimit).toBeNull();
  });

  it("team tier matches email env", () => {
    process.env.VEHICLEOS_TEAM_EMAILS = "ops@vehicleos.app";
    const tier = resolveGarageTier({ userId: "any", email: "Ops@VehicleOS.app" });
    expect(tier).toBe("team");
  });
});
