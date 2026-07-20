import type { CreateVehicleInput, VehicleRecord } from "./vehicle-repository.js";

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
}
