import type { CreateVehicleInput, VehicleRecord, UpdateVehicleInput } from "./vehicle-repository.js";
import { normalizeOwnerContextMemory } from "@vehicleos/domain";

export class InMemoryVehicleRepository {
  private readonly vehicles = new Map<string, VehicleRecord>();

  async create(input: CreateVehicleInput): Promise<VehicleRecord> {
    const id = crypto.randomUUID();
    const record: VehicleRecord = {
      id,
      userId: input.userId ?? crypto.randomUUID(),
      ...input,
      ownerContextMemory: normalizeOwnerContextMemory(input.ownerContextMemory),
      createdAt: new Date().toISOString(),
    };
    this.vehicles.set(id, record);
    return record;
  }

  async findById(vehicleId: string): Promise<VehicleRecord | null> {
    return this.vehicles.get(vehicleId) ?? null;
  }

  async listByUserId(userId: string): Promise<VehicleRecord[]> {
    return [...this.vehicles.values()].filter((vehicle) => vehicle.userId === userId);
  }

  async update(vehicleId: string, userId: string, patch: UpdateVehicleInput): Promise<VehicleRecord | null> {
    const existing = this.vehicles.get(vehicleId);
    if (!existing || existing.userId !== userId) return null;

    const nextStatedMilesPerYear =
      patch.statedMilesPerYear === undefined ? existing.statedMilesPerYear ?? null : patch.statedMilesPerYear;
    const statedMilesPerYearUpdatedAt =
      patch.statedMilesPerYear !== undefined &&
      patch.statedMilesPerYear !== existing.statedMilesPerYear
        ? new Date().toISOString()
        : existing.statedMilesPerYearUpdatedAt ?? null;

    const nextOwnerContextMemory =
      patch.ownerContextMemory === undefined
        ? existing.ownerContextMemory ?? {}
        : normalizeOwnerContextMemory(patch.ownerContextMemory);

    const next: VehicleRecord = {
      ...existing,
      ...patch,
      trim: patch.trim === null ? undefined : patch.trim ?? existing.trim,
      ownedSince: patch.ownedSince === undefined ? existing.ownedSince ?? null : patch.ownedSince,
      drivingStyle: patch.drivingStyle === undefined ? existing.drivingStyle ?? null : patch.drivingStyle,
      statedMilesPerYear: nextStatedMilesPerYear,
      statedMilesPerYearUpdatedAt,
      ownerContextMemory: nextOwnerContextMemory,
    };
    this.vehicles.set(vehicleId, next);
    return next;
  }

  async delete(vehicleId: string, userId: string): Promise<boolean> {
    const existing = this.vehicles.get(vehicleId);
    if (!existing || existing.userId !== userId) return false;
    this.vehicles.delete(vehicleId);
    return true;
  }
}
