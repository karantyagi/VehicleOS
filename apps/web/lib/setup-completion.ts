import type { VehicleOwnerProfile } from "./driver-habits";

/** True when vehicle exists and driving profile is saved on the server. */
export const isGarageSetupComplete = (vehicle: Pick<VehicleOwnerProfile, "drivingStyle"> | null): boolean =>
  Boolean(vehicle?.drivingStyle);
