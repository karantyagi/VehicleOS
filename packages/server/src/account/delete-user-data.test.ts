import { describe, expect, it, vi } from "vitest";
import { deleteUserData } from "./delete-user-data.js";

describe("deleteUserData", () => {
  it("deletes events and vehicles in a transaction", async () => {
    const queries: string[] = [];
    const client = {
      query: vi.fn(async (sql: string) => {
        queries.push(sql.trim());
        return { rows: [] };
      }),
      release: vi.fn(),
    };

    const pool = {
      connect: vi.fn(async () => client),
    };

    await deleteUserData(pool as never, "user-123");

    expect(queries[0]).toBe("BEGIN");
    expect(queries[1]).toContain("DELETE FROM domain_events");
    expect(queries[2]).toContain("DELETE FROM vehicles WHERE user_id = $1");
    expect(queries[3]).toBe("COMMIT");
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("rolls back when vehicle delete fails", async () => {
    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("DELETE FROM vehicles")) {
          throw new Error("db error");
        }
        return { rows: [] };
      }),
      release: vi.fn(),
    };

    const pool = {
      connect: vi.fn(async () => client),
    };

    await expect(deleteUserData(pool as never, "user-123")).rejects.toThrow("db error");
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.release).toHaveBeenCalledOnce();
  });
});
