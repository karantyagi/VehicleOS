import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export const getPool = (): pg.Pool => {
  if (pool) return pool;

  const connectionString =
    process.env.DATABASE_URL ?? "postgresql://vehicleos:vehicleos@localhost:5432/vehicleos";

  pool = new Pool({ connectionString });
  return pool;
};

export const closePool = async (): Promise<void> => {
  if (!pool) return;
  await pool.end();
  pool = null;
};
