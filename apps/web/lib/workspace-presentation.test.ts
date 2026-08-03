import { describe, expect, it } from "vitest";
import { resolveWorkspacePresentation } from "./workspace-presentation";

const settledHome = {
  hasVehicle: true,
  ownerSetupComplete: true,
  isDashboardLoading: false,
  isGarageLoading: false,
  isVehicleStateLoading: false,
  isAddingVehicle: false,
};

describe("resolveWorkspacePresentation", () => {
  it("uses a Home-shaped loading state only before the first vehicle is ready", () => {
    expect(
      resolveWorkspacePresentation({
        ...settledHome,
        hasVehicle: false,
        isDashboardLoading: true,
      }),
    ).toEqual({ body: "loading", showAdditionalVehicleSheet: false });
  });

  it("shows first-car setup after an empty garage resolves", () => {
    expect(
      resolveWorkspacePresentation({
        ...settledHome,
        hasVehicle: false,
      }),
    ).toEqual({ body: "first-vehicle-setup", showAdditionalVehicleSheet: false });
  });

  it("keeps Home visible while adding another vehicle", () => {
    expect(
      resolveWorkspacePresentation({
        ...settledHome,
        isAddingVehicle: true,
      }),
    ).toEqual({ body: "home", showAdditionalVehicleSheet: true });
  });

  it("keeps the shell stable while a selected vehicle is preparing", () => {
    expect(
      resolveWorkspacePresentation({
        ...settledHome,
        isVehicleStateLoading: true,
      }),
    ).toEqual({ body: "loading", showAdditionalVehicleSheet: false });
  });
});
