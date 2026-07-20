import { afterAll, describe, expect, it } from "vitest";
import { InMemoryEventStore } from "@vehicleos/domain";
import { InMemoryVehicleRepository } from "@vehicleos/server";
import { buildApp } from "./app.js";

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
});
