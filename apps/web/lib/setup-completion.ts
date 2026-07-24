import { hasDriverHabits } from "./driver-habits";

/** True when vehicle exists and driver habits are saved on this device (SCH-2 adds server sync). */
export const isGarageSetupComplete = (vehicleId: string | null): boolean => {
  if (!vehicleId) return false;
  return hasDriverHabits(vehicleId);
};
