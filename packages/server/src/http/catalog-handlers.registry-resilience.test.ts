import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("listSupportedVehicles registry resilience", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock("@vehicleos/knowledge");
    vi.resetModules();
  });

  it("returns 200 when tier2000 registry load throws (Vercel bundle regression)", async () => {
    vi.doMock("@vehicleos/knowledge", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@vehicleos/knowledge")>();
      return {
        ...actual,
        loadTier2000SourceByPackId: () => {
          throw new Error("ENOENT: tier-2000 CSV missing from serverless bundle");
        },
      };
    });

    const { listSupportedVehicles, __resetCatalogHandlerCachesForTests } = await import(
      "../http/catalog-handlers.js"
    );
    __resetCatalogHandlerCachesForTests();

    const result = listSupportedVehicles({ verifiedOnly: true, limit: 5 });

    expect(result.status).toBe(200);
    expect(result.body.total).toBeGreaterThan(0);
    expect(result.body.vehicles?.length).toBeGreaterThan(0);
    expect(result.body.vehicles?.every((row) => row.scheduleSourceLine == null)).toBe(true);
  }, 10_000);
});
