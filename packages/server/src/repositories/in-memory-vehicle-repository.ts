import type { CreateVehicleInput, VehicleRecord, UpdateVehicleInput } from "./vehicle-repository.js";

export class InMemoryVehicleRepository {
  private readonly vehicles = new Map<string, VehicleRecord>();

  async create(input: CreateVehicleInput): Promise<VehicleRecord> {
    const id = crypto.randomUUID();
    const record: VehicleRecord = {
      id,
      userId: input.userId ?? crypto.randomUUID(),
      ...input,
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
    const next: VehicleRecord = {
      ...existing,
      ...patch,
      trim: patch.trim === null ? undefined : patch.trim ?? existing.trim,
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
