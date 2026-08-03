export type WorkspaceBody = "home" | "loading" | "first-vehicle-setup" | "driver-setup";

export type WorkspacePresentation = {
  body: WorkspaceBody;
  showAdditionalVehicleSheet: boolean;
};

export type WorkspacePresentationInput = {
  hasVehicle: boolean;
  ownerSetupComplete: boolean;
  isDashboardLoading: boolean;
  isGarageLoading: boolean;
  isVehicleStateLoading: boolean;
  isAddingVehicle: boolean;
};

/**
 * Keep the Home canvas mounted whenever there is an existing vehicle. Loading
 * a new vehicle or opening the add-car flow is a local content transition, not
 * a different application screen.
 */
export function resolveWorkspacePresentation({
  hasVehicle,
  ownerSetupComplete,
  isDashboardLoading,
  isGarageLoading,
  isVehicleStateLoading,
  isAddingVehicle,
}: WorkspacePresentationInput): WorkspacePresentation {
  if (!hasVehicle) {
    if (isDashboardLoading || isGarageLoading || isVehicleStateLoading) {
      return { body: "loading", showAdditionalVehicleSheet: false };
    }

    return { body: "first-vehicle-setup", showAdditionalVehicleSheet: false };
  }

  if (!ownerSetupComplete) {
    return { body: "driver-setup", showAdditionalVehicleSheet: false };
  }

  return {
    body: isVehicleStateLoading ? "loading" : "home",
    showAdditionalVehicleSheet: isAddingVehicle && !isVehicleStateLoading,
  };
}
