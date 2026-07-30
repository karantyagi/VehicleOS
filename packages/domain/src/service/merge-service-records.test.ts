import { describe, expect, it } from "vitest";
import { InMemoryEventStore } from "../adapters/in-memory-event-store.js";
import { EVENT_TYPES, EVENT_VERSIONS } from "../events/catalog.js";
import type { ServiceTimelineEntry } from "../projections/types.js";
import { findPossibleServiceDuplicates, mergeServiceRecords } from "./merge-service-records.js";

const timelineRow = (
  serviceId: string,
  overrides: Partial<ServiceTimelineEntry> = {},
): ServiceTimelineEntry => ({
  serviceId,
  shop: "Ira Acura Westwood",
  shopLocation: "Westwood, MA",
  serviceDate: "2024-11-11",
  mileage: 37_883,
  lineItems: ["Oil and filter changed"],
  total: "$0.00",
  evidenceIds: [],
  source: "carfax_import",
  ...overrides,
});

describe("service record reconciliation", () => {
  it("suggests the adjacent-day same-mileage overlap from owner history", () => {
    const candidates = findPossibleServiceDuplicates([
      timelineRow("dealer"),
      timelineRow("diy", {
        shop: "Self-Service (DIY)",
        shopLocation: undefined,
        serviceDate: "2024-11-12",
        lineItems: [
          "Wiper(s) replaced",
          "Brakes checked",
          "Oil and filter changed",
          "Tires rotated",
        ],
        source: "owner_note",
      }),
    ]);

    expect(candidates).toEqual([
      {
        firstServiceId: "dealer",
        secondServiceId: "diy",
        dayDistance: 1,
        matchingLineItems: ["Oil and filter changed"],
      },
    ]);
  });

  it("does not suggest a merge without all conservative signals", () => {
    const base = timelineRow("base");

    expect(
      findPossibleServiceDuplicates([
        base,
        timelineRow("different-mileage", { mileage: 37_884 }),
        timelineRow("too-far", { serviceDate: "2024-11-13" }),
        timelineRow("different-work", { lineItems: ["Tires rotated"] }),
      ]),
    ).toEqual([]);
  });

  it("keeps the owner-selected record and combines unique details and evidence", async () => {
    const eventStore = new InMemoryEventStore();
    await eventStore.append({
      aggregateType: "vehicle",
      aggregateId: "veh-1",
      eventType: EVENT_TYPES.SERVICE_RECORDED,
      eventVersion: EVENT_VERSIONS[EVENT_TYPES.SERVICE_RECORDED],
      payload: {
        vehicleId: "veh-1",
        ...timelineRow("dealer"),
        evidenceIds: ["receipt-1"],
      },
      correlationId: "corr-1",
    });
    await eventStore.append({
      aggregateType: "vehicle",
      aggregateId: "veh-1",
      eventType: EVENT_TYPES.SERVICE_RECORDED,
      eventVersion: EVENT_VERSIONS[EVENT_TYPES.SERVICE_RECORDED],
      payload: {
        vehicleId: "veh-1",
        ...timelineRow("diy", {
          shop: "Self-Service (DIY)",
          serviceDate: "2024-11-12",
          lineItems: ["Oil and filter changed", "Tires rotated"],
          total: "$84.00",
          evidenceIds: ["note-1"],
          source: "owner_note",
        }),
      },
      correlationId: "corr-2",
    });

    const result = await mergeServiceRecords({
      eventStore,
      input: {
        vehicleId: "veh-1",
        targetServiceId: "dealer",
        mergedServiceId: "diy",
        lineItems: ["Tires rotated", "Oil and filter changed"],
      },
    });

    expect(result.state.timeline).toHaveLength(1);
    expect(result.state.timeline[0]).toMatchObject({
      serviceId: "dealer",
      shop: "Ira Acura Westwood",
      serviceDate: "2024-11-11",
      lineItems: ["Tires rotated", "Oil and filter changed"],
      evidenceIds: ["receipt-1", "note-1"],
      total: "$84.00",
    });
  });

  it("rejects an arbitrary pair that was not proposed as a duplicate", async () => {
    const eventStore = new InMemoryEventStore();
    const rows: [string, Partial<ServiceTimelineEntry>][] = [
      ["first", {}],
      ["second", { serviceDate: "2024-12-20", mileage: 39_100, lineItems: ["Tires rotated"] }],
    ];
    for (const [serviceId, overrides] of rows) {
      await eventStore.append({
        aggregateType: "vehicle",
        aggregateId: "veh-1",
        eventType: EVENT_TYPES.SERVICE_RECORDED,
        eventVersion: EVENT_VERSIONS[EVENT_TYPES.SERVICE_RECORDED],
        payload: {
          vehicleId: "veh-1",
          ...timelineRow(serviceId, overrides),
        },
      });
    }

    await expect(
      mergeServiceRecords({
        eventStore,
        input: {
          vehicleId: "veh-1",
          targetServiceId: "first",
          mergedServiceId: "second",
        },
      }),
    ).rejects.toThrow("not a conservative duplicate candidate");
  });
});
