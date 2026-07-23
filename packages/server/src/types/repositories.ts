import type { CreateVehicleInput, UpdateVehicleInput, VehicleRecord } from "../repositories/vehicle-repository.js";

export type VehicleRepositoryLike = {
  create(input: CreateVehicleInput): Promise<VehicleRecord>;
  findById(vehicleId: string): Promise<VehicleRecord | null>;
  listByUserId(userId: string): Promise<VehicleRecord[]>;
  update(vehicleId: string, userId: string, patch: UpdateVehicleInput): Promise<VehicleRecord | null>;
  delete(vehicleId: string, userId: string): Promise<boolean>;
};
