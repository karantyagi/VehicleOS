import { describe, expect, it } from "vitest";
import { enrichVehicleOsImportDraftHandler, submitVehicleOsImport } from "../http/import-handlers.js";
import { InMemoryEventStore } from "@vehicleos/domain";
import { InMemoryVehicleRepository } from "../repositories/in-memory-vehicle-repository.js";
import { createApiServices } from "../services/index.js";

describe("import-handlers enrich + submit", () => {
  const buildServices = async () => {
    const vehicles = new InMemoryVehicleRepository();
    const created = await vehicles.create({
      userId: "user-1",
      vin: "19UUB6F47MA008400",
      year: 2021,
      make: "Acura",
      model: "TLX",
      currentMileage: 50000,
      ownerContextMemory: { primaryCity: "Boston" },
    });

    const services = createApiServices({
      eventStore: new InMemoryEventStore(),
      vehicles,
      shopLocationLookup: {
        lookupShopLocation: async ({ shop }) => ({
          status: "resolved",
          shop,
          shopLocation: "Denver, CO",
          source: "nominatim",
        }),
      },
    });

    return { services, vehicle: created };
  };

  it("enriches draft via enrich-draft handler", async () => {
    const { services, vehicle } = await buildServices();
    const response = await enrichVehicleOsImportDraftHandler(
      services,
      vehicle.id,
      {
        draft: {
          version: "1",
          source: "test",
          exportedAt: "2026-01-01T00:00:00.000Z",
          vehicle: {
            vin: vehicle.vin,
            year: vehicle.year,
            make: vehicle.make,
            model: vehicle.model,
            currentMileage: vehicle.currentMileage,
          },
          services: [
            {
              shop: "Mystery Shop",
              serviceDate: "2025-06-01",
              mileage: 51000,
              lineItems: ["Oil changed"],
            },
          ],
        },
      },
      { userId: vehicle.userId },
    );

    expect(response.status).toBe(200);
    const body = response.body as {
      draft: { services: { shopLocation?: string }[] };
      shopLocationHints: Record<string, { candidates?: string[] }>;
    };
    expect(body.draft.services[0]?.shopLocation).toBe("Denver, CO");
    expect(body.shopLocationHints).toEqual({});
  });

  it("returns ambiguous hints when lookup is inconclusive", async () => {
    const vehicles = new InMemoryVehicleRepository();
    const created = await vehicles.create({
      userId: "user-1",
      vin: "19UUB6F47MA008400",
      year: 2021,
      make: "Acura",
      model: "TLX",
      currentMileage: 50000,
      ownerContextMemory: { primaryCity: "Boston" },
    });

    const services = createApiServices({
      eventStore: new InMemoryEventStore(),
      vehicles,
      shopLocationLookup: {
        lookupShopLocation: async ({ shop }) => ({
          status: "ambiguous",
          shop,
          candidates: ["Framingham, MA", "Natick, MA"],
          message: "Multiple matches",
        }),
      },
    });

    const response = await enrichVehicleOsImportDraftHandler(
      services,
      created.id,
      {
        draft: {
          version: "1",
          source: "test",
          exportedAt: "2026-01-01T00:00:00.000Z",
          vehicle: {
            vin: created.vin,
            year: created.year,
            make: created.make,
            model: created.model,
            currentMileage: created.currentMileage,
          },
          services: [
            {
              shop: "Mystery Shop",
              serviceDate: "2025-06-01",
              mileage: 51000,
              lineItems: ["Oil changed"],
            },
          ],
        },
      },
      { userId: created.userId },
    );

    expect(response.status).toBe(200);
    const body = response.body as {
      draft: { services: { shopLocation?: string }[] };
      shopLocationHints: Record<string, { candidates?: string[] }>;
    };
    expect(body.draft.services[0]?.shopLocation).toBeUndefined();
    expect(body.shopLocationHints["mystery shop"]?.candidates).toEqual(["Framingham, MA", "Natick, MA"]);
  });

  it("uses lookup on submit safety net", async () => {
    const { services, vehicle } = await buildServices();
    const response = await submitVehicleOsImport(
      services,
      vehicle.id,
      {
        services: [
          {
            shop: "Another Mystery Shop",
            serviceDate: "2025-07-01",
            mileage: 52000,
            lineItems: ["Inspection"],
          },
        ],
      },
      { userId: vehicle.userId },
    );

    expect(response.status).toBe(201);
    const body = response.body as { importedCount: number };
    expect(body.importedCount).toBe(1);
  });
});
