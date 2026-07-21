import type pg from "pg";

export type CreateVehicleInput = {
  userId?: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  currentMileage: number;
};

export type VehicleRecord = CreateVehicleInput & {
  id: string;
  userId: string;
  createdAt: string;
};

export class VehicleRepository {
  constructor(private readonly pool: pg.Pool) {}

  async create(input: CreateVehicleInput): Promise<VehicleRecord> {
    const id = crypto.randomUUID();
    const userId = input.userId ?? crypto.randomUUID();

    const result = await this.pool.query<{
      id: string;
      user_id: string;
      vin: string;
      year: number;
      make: string;
      model: string;
      trim: string | null;
      current_mileage: number;
      created_at: Date;
    }>(
      `insert into vehicles (id, user_id, vin, year, make, model, trim, current_mileage)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [id, userId, input.vin, input.year, input.make, input.model, input.trim ?? null, input.currentMileage],
    );

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      vin: row.vin,
      year: row.year,
      make: row.make,
      model: row.model,
      trim: row.trim ?? undefined,
      currentMileage: row.current_mileage,
      createdAt: row.created_at.toISOString(),
    };
  }

  async findById(vehicleId: string): Promise<VehicleRecord | null> {
    const result = await this.pool.query<{
      id: string;
      user_id: string;
      vin: string;
      year: number;
      make: string;
      model: string;
      trim: string | null;
      current_mileage: number;
      created_at: Date;
    }>(`select * from vehicles where id = $1`, [vehicleId]);

    const row = result.rows[0];
    if (!row) return null;

    return mapVehicleRow(row);
  }

  async listByUserId(userId: string): Promise<VehicleRecord[]> {
    const result = await this.pool.query<{
      id: string;
      user_id: string;
      vin: string;
      year: number;
      make: string;
      model: string;
      trim: string | null;
      current_mileage: number;
      created_at: Date;
    }>(
      `select * from vehicles where user_id = $1 order by created_at asc`,
      [userId],
    );

    return result.rows.map(mapVehicleRow);
  }
}

const mapVehicleRow = (row: {
  id: string;
  user_id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  current_mileage: number;
  created_at: Date;
}): VehicleRecord => ({
  id: row.id,
  userId: row.user_id,
  vin: row.vin,
  year: row.year,
  make: row.make,
  model: row.model,
  trim: row.trim ?? undefined,
  currentMileage: row.current_mileage,
  createdAt: row.created_at.toISOString(),
});
