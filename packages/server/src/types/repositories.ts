import type { CreateVehicleInput, VehicleRecord } from "../repositories/vehicle-repository.js";

export type VehicleRepositoryLike = {
  create(input: CreateVehicleInput): Promise<VehicleRecord>;
  findById(vehicleId: string): Promise<VehicleRecord | null>;
  listByUserId(userId: string): Promise<VehicleRecord[]>;
};
