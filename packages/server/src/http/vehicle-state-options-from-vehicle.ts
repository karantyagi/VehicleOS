import type { VehicleRecord } from "../repositories/vehicle-repository.js";
import type { VehicleStateOptions } from "../services/golden-path-service.js";

export const vehicleStateOptionsFromVehicle = (
  vehicle: Pick<
    VehicleRecord,
    | "createdAt"
    | "ownerContextMemory"
    | "ownedSince"
    | "drivingStyle"
    | "statedMilesPerYear"
    | "year"
    | "make"
    | "model"
    | "trim"
  >,
): VehicleStateOptions => ({
  vehicleCreatedAt: vehicle.createdAt,
  ownerContextMemory: vehicle.ownerContextMemory,
  ownedSince: vehicle.ownedSince,
  drivingStyle: vehicle.drivingStyle,
  statedMilesPerYear: vehicle.statedMilesPerYear,
  packProfile: {
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim,
  },
});
