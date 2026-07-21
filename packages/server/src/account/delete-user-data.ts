import type pg from "pg";

export async function deleteUserData(pool: pg.Pool, userId: string): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `DELETE FROM domain_events
       WHERE aggregate_id IN (SELECT id FROM vehicles WHERE user_id = $1)
          OR payload_json->>'vehicleId' IN (
            SELECT id::text FROM vehicles WHERE user_id = $1
          )`,
      [userId],
    );

    await client.query(`DELETE FROM vehicles WHERE user_id = $1`, [userId]);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
