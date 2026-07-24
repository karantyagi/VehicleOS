import type { VehicleRecord } from "../repositories/vehicle-repository.js";

export const recommendationContextFromVehicle = (
  vehicle: Pick<VehicleRecord, "ownerContextMemory" | "drivingStyle">,
) => ({
  ownerContextMemory: vehicle.ownerContextMemory ?? {},
  drivingStyle: vehicle.drivingStyle ?? null,
});
