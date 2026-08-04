import { describe, expect, it } from "vitest";
import {
  enrichVehicleOsImportDraftHandler,
  submitVehicleOsImport,
  submitVehicleOsRmvImport,
} from "../http/import-handlers.js";
import { InMemoryEventStore, projectOwnerDriverLicenses } from "@vehicleos/domain";
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
          source: "geoapify",
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
              total: "$0.00",
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
      locationEvidence: Record<string, { status: string; location?: string }>;
    };
    expect(body.draft.services[0]?.shopLocation).toBe("Denver, CO");
    expect(body.shopLocationHints).toEqual({});
    expect(body.locationEvidence["mystery shop"]).toEqual({ status: "geoapify", location: "Denver, CO" });
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
              total: "$0.00",
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
      locationEvidence: Record<string, { status: string }>;
    };
    expect(body.draft.services[0]?.shopLocation).toBeUndefined();
    expect(body.shopLocationHints["mystery shop"]?.candidates).toEqual(["Framingham, MA", "Natick, MA"]);
    expect(body.locationEvidence["mystery shop"]?.status).toBe("ambiguous");
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
            total: "$0.00",
          },
        ],
      },
      { userId: vehicle.userId },
    );

    expect(response.status).toBe(201);
    const body = response.body as { importedCount: number };
    expect(body.importedCount).toBe(1);
  });

  it("requires owner confirmation for low-trust CARFAX rows and persists that decision", async () => {
    const { services, vehicle } = await buildServices();
    const service = {
      shop: "Self Reported",
      serviceDate: "2025-05-11",
      mileage: 43_190,
      lineItems: ["Oil and filter changed"],
      total: "$0.00",
    };

    const withoutConfirmation = await submitVehicleOsImport(
      services,
      vehicle.id,
      { services: [service] },
      { userId: vehicle.userId },
    );
    expect(withoutConfirmation.status).toBe(409);
    expect(await services.eventStore.loadByAggregate("vehicle", vehicle.id)).toHaveLength(0);

    const confirmed = await submitVehicleOsImport(
      services,
      vehicle.id,
      {
        services: [
          {
            ...service,
            carfaxReview: {
              ownerConfirmed: true,
              locationEvidence: { status: "owner_reported" },
            },
          },
        ],
      },
      { userId: vehicle.userId },
    );

    expect(confirmed.status).toBe(201);
    expect(confirmed.body).toMatchObject({
      importedCount: 1,
      verificationTaskId: undefined,
      importReview: { verifyCount: 0 },
      timeline: [
        expect.objectContaining({
          carfaxImport: expect.objectContaining({
            sourceTrust: "owner_reported",
            locationEvidence: expect.objectContaining({ status: "owner_reported" }),
            ownerConfirmedAt: expect.any(String),
          }),
        }),
      ],
    });
  });

  it("does not create verification tasks when re-importing duplicate rows", async () => {
    const { services, vehicle } = await buildServices();
    const payload = {
      services: [
        {
          shop: "Unknown Shop",
          serviceDate: "2025-06-01",
          mileage: 51000,
          lineItems: ["Oil changed"],
          total: "$0.00",
        },
      ],
    };

    const first = await submitVehicleOsImport(services, vehicle.id, payload, { userId: vehicle.userId });
    expect(first.status).toBe(201);
    const firstBody = first.body as { importedCount: number };
    expect(firstBody.importedCount).toBe(1);

    const second = await submitVehicleOsImport(services, vehicle.id, payload, { userId: vehicle.userId });
    expect(second.status).toBe(201);
    const secondBody = second.body as {
      importedCount: number;
      skippedCount: number;
      verificationTaskId?: string;
      importReview?: { alreadyOnFileCount?: number; verifyCount: number };
    };
    expect(secondBody.importedCount).toBe(0);
    expect(secondBody.skippedCount).toBe(1);
    expect(secondBody.verificationTaskId).toBeUndefined();
    expect(secondBody.importReview?.alreadyOnFileCount).toBe(1);
    expect(secondBody.importReview?.verifyCount).toBe(0);
  });

  it("skips re-import when mileage differs but visit matches", async () => {
    const { services, vehicle } = await buildServices();
    const first = await submitVehicleOsImport(
      services,
      vehicle.id,
      {
        services: [
          {
            shop: "Another Mystery Shop",
            serviceDate: "2025-07-01",
            mileage: 52000,
            lineItems: ["Inspection"],
            total: "$0.00",
          },
        ],
      },
      { userId: vehicle.userId },
    );
    expect(first.status).toBe(201);

    const second = await submitVehicleOsImport(
      services,
      vehicle.id,
      {
        services: [
          {
            shop: "Another Mystery Shop",
            serviceDate: "2025-07-01",
            mileage: 51950,
            lineItems: ["Inspection"],
            total: "$0.00",
          },
        ],
      },
      { userId: vehicle.userId },
    );

    expect(second.status).toBe(201);
    const body = second.body as { importedCount: number; skippedCount: number };
    expect(body.importedCount).toBe(0);
    expect(body.skippedCount).toBe(1);
  });

  it("writes RMV vehicle records and driver's-license deadlines to separate aggregates", async () => {
    const { services, vehicle } = await buildServices();
    const response = await submitVehicleOsRmvImport(
      services,
      vehicle.id,
      {
        source: "rmv-pdf-manual",
        records: [
          {
            recordDate: "2026-07-15",
            mileage: null,
            eventType: "registration",
            agency: "Massachusetts RMV",
            description: "Registration renewed",
            details: ["Expiration Date: 2026-09-15"],
          },
          {
            recordDate: "2024-04-16",
            mileage: null,
            eventType: "license",
            agency: "Massachusetts RMV",
            description: "Driver's license active",
            details: ["Expiration Date: 2026-09-30"],
          },
        ],
      },
      { userId: vehicle.userId },
    );

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      importedCount: 2,
      ownershipRecords: expect.arrayContaining([
        expect.objectContaining({ eventType: "registration" }),
        expect.objectContaining({ eventType: "license" }),
      ]),
    });
    await expect(services.eventStore.loadByAggregate("owner", vehicle.userId)).resolves.toHaveLength(1);
    await expect(services.eventStore.loadByAggregate("vehicle", vehicle.id)).resolves.not.toEqual([]);
  });

  it("requires an explicit owner decision before an RMV import changes a driver-license deadline", async () => {
    const { services, vehicle } = await buildServices();
    const originalLicense = {
      recordDate: "2024-04-16",
      mileage: null,
      eventType: "license" as const,
      agency: "Massachusetts RMV (myRMV)",
      description: "Driver's license active — Class D",
      details: ["License class: D", "Expiration Date: 2026-10-10"],
    };
    const importedLicense = {
      ...originalLicense,
      details: ["License class: D", "Expiration Date: 2031-10-10"],
    };

    expect(
      (await submitVehicleOsRmvImport(
        services,
        vehicle.id,
        { records: [originalLicense] },
        { userId: vehicle.userId },
      )).status,
    ).toBe(201);

    const withoutConfirmation = await submitVehicleOsRmvImport(
      services,
      vehicle.id,
      { records: [importedLicense] },
      { userId: vehicle.userId },
    );
    expect(withoutConfirmation.status).toBe(409);
    expect(projectOwnerDriverLicenses(await services.eventStore.loadByAggregate("owner", vehicle.userId))).toMatchObject([
      { expirationDate: "2026-10-10" },
    ]);

    const confirmed = await submitVehicleOsRmvImport(
      services,
      vehicle.id,
      { records: [importedLicense], ownerLicenseChangeConfirmed: true },
      { userId: vehicle.userId },
    );
    expect(confirmed.status).toBe(201);
    expect(projectOwnerDriverLicenses(await services.eventStore.loadByAggregate("owner", vehicle.userId))).toMatchObject([
      {
        expirationDate: "2031-10-10",
        details: expect.arrayContaining(["Imported while reviewing 2021 Acura TLX"]),
      },
    ]);
  });
});
