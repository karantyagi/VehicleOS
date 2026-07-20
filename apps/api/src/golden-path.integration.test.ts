import { afterAll, describe, expect, it } from "vitest";
import { InMemoryEventStore } from "@vehicleos/domain";
import { buildApp } from "./app.js";
import { InMemoryVehicleRepository } from "./repositories/in-memory-vehicle-repository.js";

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
        mileage: 30_000,
        lineItems: ["Oil change (synthetic)"],
        total: "$60.00",
      },
    });

    expect(receiptResponse.statusCode).toBe(201);
    const receiptBody = receiptResponse.json() as {
      task: { taskId: string; status: string } | null;
      nowQueue: Array<{ status: string }>;
    };
    expect(receiptBody.task).not.toBeNull();
    expect(receiptBody.nowQueue.length).toBeGreaterThan(0);

    const followUp = await app.inject({
      method: "POST",
      url: `/api/vehicles/${vehicle.id}/receipts`,
      payload: {
        shop: "Town Fair Tire",
        serviceDate: "2026-01-12",
        mileage: 36_500,
        lineItems: ["Tire rotation"],
        total: "$45.00",
      },
    });

    expect(followUp.statusCode).toBe(201);
    const followUpBody = followUp.json() as {
      recommendation: { title: string } | null;
      task: { taskId: string } | null;
    };
    expect(followUpBody.recommendation?.title).toBe("Oil change due");

    const decideResponse = await app.inject({
      method: "POST",
      url: `/api/tasks/${followUpBody.task!.taskId}/decide`,
      payload: {
        vehicleId: vehicle.id,
        decision: "approve",
      },
    });

    expect(decideResponse.statusCode).toBe(200);
    const decided = decideResponse.json() as {
      nowQueue: Array<{ taskId: string; status: string }>;
    };
    const updatedTask = decided.nowQueue.find((item) => item.taskId === followUpBody.task!.taskId);
    expect(updatedTask?.status).toBe("approved");
  });
});
