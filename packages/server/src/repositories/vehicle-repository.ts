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

export type UpdateVehicleInput = {
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string | null;
  currentMileage?: number;
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
    return mapVehicleRow(row);
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

  async update(vehicleId: string, userId: string, patch: UpdateVehicleInput): Promise<VehicleRecord | null> {
    const existing = await this.findById(vehicleId);
    if (!existing || existing.userId !== userId) return null;

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
      `update vehicles
       set vin = $3,
           year = $4,
           make = $5,
           model = $6,
           trim = $7,
           current_mileage = $8
       where id = $1 and user_id = $2
       returning *`,
      [
        vehicleId,
        userId,
        patch.vin ?? existing.vin,
        patch.year ?? existing.year,
        patch.make ?? existing.make,
        patch.model ?? existing.model,
        patch.trim === undefined ? existing.trim ?? null : patch.trim,
        patch.currentMileage ?? existing.currentMileage,
      ],
    );

    const row = result.rows[0];
    return row ? mapVehicleRow(row) : null;
  }

  async delete(vehicleId: string, userId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const owned = await client.query(`select id from vehicles where id = $1 and user_id = $2`, [vehicleId, userId]);
      if (owned.rowCount === 0) {
        await client.query("ROLLBACK");
        return false;
      }

      await client.query(
        `delete from domain_events
         where aggregate_id = $1
            or payload_json->>'vehicleId' = $1`,
        [vehicleId],
      );
      await client.query(`delete from vehicles where id = $1 and user_id = $2`, [vehicleId, userId]);
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
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
