import { afterAll, describe, expect, it } from "vitest";
import { InMemoryEventStore } from "@vehicleos/domain";
import { InMemoryVehicleRepository } from "@vehicleos/server";
import { buildApp } from "./app.js";
import { TEST_USER_ID } from "./auth-context.js";

describe("golden path API", () => {
  const appPromise = buildApp({
    eventStore: new InMemoryEventStore(),
    vehicles: new InMemoryVehicleRepository(),
  });

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it("runs receipt → service.recorded → recommendation → task", async () => {
    const app = await appPromise;

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/vehicles",
      payload: {
        vin: "TEST-VIN",
        year: 2019,
        make: "Honda",
        model: "Civic",
        currentMileage: 30_000,
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const { vehicle } = createResponse.json() as { vehicle: { id: string } };

    const receiptResponse = await app.inject({
      method: "POST",
      url: `/api/vehicles/${vehicle.id}/receipts`,
      payload: {
        shop: "Jiffy Lube",
        serviceDate: "2025-06-01",
        mileage: 30_500,
        lineItems: ["Oil change"],
        total: "$45.00",
        storageKey: `test/${vehicle.id}/oil-change.pdf`,
        channel: "receipt_upload",
      },
    });

    expect(receiptResponse.statusCode).toBe(201);
    const receiptBody = receiptResponse.json() as {
      timeline: unknown[];
      nowQueue: { taskId: string; status: string }[];
    };

    expect(receiptBody.timeline.length).toBeGreaterThan(0);
    expect(receiptBody.nowQueue.some((item) => item.status === "pending")).toBe(true);

    const pendingTask = receiptBody.nowQueue.find((item) => item.status === "pending");
    expect(pendingTask).toBeDefined();

    const decideResponse = await app.inject({
      method: "POST",
      url: `/api/tasks/${pendingTask!.taskId}/decide`,
      payload: { vehicleId: vehicle.id, decision: "approve" },
    });

    expect(decideResponse.statusCode).toBe(200);
    const decideBody = decideResponse.json() as {
      nowQueue: { taskId: string; status: string }[];
    };

    expect(
      decideBody.nowQueue.find((item) => item.taskId === pendingTask!.taskId)?.status,
    ).not.toBe("pending");
  });

  it("creates a verification task when receipt mileage regresses", async () => {
    const app = await appPromise;

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/vehicles",
      payload: {
        vin: "TEST-VIN-2",
        year: 2020,
        make: "Toyota",
        model: "Camry",
        currentMileage: 50_000,
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const { vehicle } = createResponse.json() as { vehicle: { id: string } };

    const firstReceipt = await app.inject({
      method: "POST",
      url: `/api/vehicles/${vehicle.id}/receipts`,
      payload: {
        shop: "Dealer",
        serviceDate: "2026-01-10",
        mileage: 50_500,
        lineItems: ["Oil change"],
        total: "$55.00",
        storageKey: `test/${vehicle.id}/first.pdf`,
        channel: "receipt_upload",
      },
    });

    expect(firstReceipt.statusCode).toBe(201);

    const conflictReceipt = await app.inject({
      method: "POST",
      url: `/api/vehicles/${vehicle.id}/receipts`,
      payload: {
        shop: "Quick Lube",
        serviceDate: "2026-02-01",
        mileage: 49_900,
        lineItems: ["Oil change"],
        total: "$49.00",
        storageKey: `test/${vehicle.id}/conflict.pdf`,
        channel: "receipt_upload",
      },
    });

    expect(conflictReceipt.statusCode).toBe(409);
    const conflictBody = conflictReceipt.json() as {
      conflict: boolean;
      timeline: unknown[];
      nowQueue: { taskKind?: string; status: string }[];
    };

    expect(conflictBody.conflict).toBe(true);
    expect(conflictBody.timeline).toHaveLength(1);
    expect(
      conflictBody.nowQueue.some(
        (item) => item.taskKind === "verification" && item.status === "pending",
      ),
    ).toBe(true);
  });

  it("analyzes a pasted dealer quote", async () => {
    const app = await appPromise;

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/vehicles",
      payload: {
        vin: "TEST-VIN-QUOTE",
        year: 2021,
        make: "Honda",
        model: "Accord",
        currentMileage: 40_000,
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const { vehicle } = createResponse.json() as { vehicle: { id: string } };

    const quoteResponse = await app.inject({
      method: "POST",
      url: `/api/vehicles/${vehicle.id}/quotes/analyze`,
      payload: {
        rawText: `Dealer quote
Oil change (synthetic) $149.00
Cabin air filter $59.00`,
      },
    });

    expect(quoteResponse.statusCode).toBe(201);
    const body = quoteResponse.json() as {
      analysis: { summary: string; lines: { verdict: string }[] };
    };
    expect(body.analysis.lines.length).toBeGreaterThan(0);
    expect(body.analysis.summary.length).toBeGreaterThan(0);

    const stateResponse = await app.inject({
      method: "GET",
      url: `/api/vehicles/${vehicle.id}/state`,
    });

    const stateBody = stateResponse.json() as { quoteAnalyses: unknown[] };
    expect(stateBody.quoteAnalyses.length).toBe(1);
  });

  it("records evidence vault entries and serves access metadata", async () => {
    const app = await appPromise;

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/vehicles",
      payload: {
        vin: "TEST-VIN-VAULT",
        year: 2018,
        make: "Mazda",
        model: "3",
        currentMileage: 55_000,
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const { vehicle } = createResponse.json() as { vehicle: { id: string } };

    const receiptResponse = await app.inject({
      method: "POST",
      url: `/api/vehicles/${vehicle.id}/receipts`,
      payload: {
        shop: "Mavis",
        serviceDate: "2026-02-01",
        mileage: 55_500,
        lineItems: ["Oil change"],
        total: "$49.00",
        storageKey: `${TEST_USER_ID}/${vehicle.id}/receipt.pdf`,
        channel: "receipt_upload",
      },
    });

    expect(receiptResponse.statusCode).toBe(201);
    const receiptBody = receiptResponse.json() as { documentId: string };

    const stateResponse = await app.inject({
      method: "GET",
      url: `/api/vehicles/${vehicle.id}/state`,
    });

    const stateBody = stateResponse.json() as {
      evidenceVault: { documentId: string; immutable: boolean }[];
      timeline: { evidenceIds: string[] }[];
    };

    expect(stateBody.evidenceVault).toHaveLength(1);
    expect(stateBody.evidenceVault[0]?.immutable).toBe(true);
    expect(stateBody.timeline[0]?.evidenceIds).toContain(receiptBody.documentId);

    const accessResponse = await app.inject({
      method: "GET",
      url: `/api/vehicles/${vehicle.id}/evidence/${receiptBody.documentId}/url`,
    });

    expect(accessResponse.statusCode).toBe(200);
    const accessBody = accessResponse.json() as { available: boolean; immutable: boolean };
    expect(accessBody.immutable).toBe(true);
    expect(accessBody.available).toBe(false);
  });
});
