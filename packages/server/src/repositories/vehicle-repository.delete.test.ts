import { describe, expect, it, vi } from "vitest";
import { VehicleRepository } from "./vehicle-repository.js";

describe("VehicleRepository.delete", () => {
  it("casts aggregate_id to uuid when deleting domain events", async () => {
    const queries: { sql: string; params: unknown[] }[] = [];
    const client = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        queries.push({ sql: sql.trim(), params: params ?? [] });
        if (sql.startsWith("select id from vehicles")) {
          return { rowCount: 1, rows: [{ id: "veh-1" }] };
        }
        return { rowCount: 1, rows: [] };
      }),
      release: vi.fn(),
    };

    const pool = {
      connect: vi.fn(async () => client),
    };

    const repository = new VehicleRepository(pool as never);
    const deleted = await repository.delete("veh-1", "user-1");

    expect(deleted).toBe(true);
    const eventDelete = queries.find((entry) => entry.sql.includes("delete from domain_events"));
    expect(eventDelete?.sql).toContain("aggregate_id = $1::uuid");
    expect(eventDelete?.sql).toContain("payload_json->>'vehicleId' = $1::text");
    expect(eventDelete?.params).toEqual(["veh-1"]);
  });
});
