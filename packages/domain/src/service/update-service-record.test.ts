import { describe, expect, it } from "vitest";
import { foldEvents, createEmptyVehicleState, EVENT_TYPES, EVENT_VERSIONS } from "../index.js";

describe("SERVICE_UPDATED projection", () => {
  it("merges patched fields onto an existing timeline row", () => {
    const vehicleId = "veh-1";
    const serviceId = "svc-1";
    const state = foldEvents(vehicleId, [
      {
        aggregateType: "vehicle",
        aggregateId: vehicleId,
        eventType: EVENT_TYPES.SERVICE_RECORDED,
        eventVersion: EVENT_VERSIONS[EVENT_TYPES.SERVICE_RECORDED],
        payload: {
          vehicleId,
          serviceId,
          shop: "Costco Tire Center",
          shopLocation: "Waltham, MA",
          serviceDate: "2026-07-15",
          mileage: 58_819,
          lineItems: ["Tires rotated"],
          total: "$0.00",
          evidenceIds: [],
          source: "carfax_import",
        },
        correlationId: "corr-1",
        createdAt: "2026-07-15T12:00:00.000Z",
      },
      {
        aggregateType: "vehicle",
        aggregateId: vehicleId,
        eventType: EVENT_TYPES.SERVICE_UPDATED,
        eventVersion: EVENT_VERSIONS[EVENT_TYPES.SERVICE_UPDATED],
        payload: {
          vehicleId,
          serviceId,
          shopLocation: "Natick, MA",
          lineItems: ["Tires rotated", "Pressure checked"],
        },
        correlationId: "corr-2",
        createdAt: "2026-07-16T12:00:00.000Z",
      },
    ]);

    expect(state.timeline).toHaveLength(1);
    expect(state.timeline[0]).toMatchObject({
      shop: "Costco Tire Center",
      shopLocation: "Natick, MA",
      lineItems: ["Tires rotated", "Pressure checked"],
    });
  });

  it("leaves state unchanged when no matching service exists", () => {
    const vehicleId = "veh-1";
    const base = createEmptyVehicleState(vehicleId);
    const next = foldEvents(vehicleId, [
      {
        aggregateType: "vehicle",
        aggregateId: vehicleId,
        eventType: EVENT_TYPES.SERVICE_UPDATED,
        eventVersion: EVENT_VERSIONS[EVENT_TYPES.SERVICE_UPDATED],
        payload: {
          vehicleId,
          serviceId: "missing",
          shop: "Updated shop",
        },
        correlationId: "corr-1",
        createdAt: "2026-07-16T12:00:00.000Z",
      },
    ]);

    expect(next.timeline).toEqual(base.timeline);
  });
});
