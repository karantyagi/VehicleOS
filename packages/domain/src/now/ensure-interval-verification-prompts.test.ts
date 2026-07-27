import { describe, expect, it } from "vitest";
import { InMemoryEventStore } from "../adapters/in-memory-event-store.js";
import { EVENT_TYPES, EVENT_VERSIONS } from "../events/catalog.js";
import { ensureIntervalVerificationPrompts } from "./ensure-interval-verification-prompts.js";
import { intervalRuleIdForEntry } from "../schedule/interval-rule-id.js";

const vehicleId = "veh-1";

const seedOilHistory = async (eventStore: InMemoryEventStore) => {
  await eventStore.append({
    aggregateType: "vehicle",
    aggregateId: vehicleId,
    eventType: EVENT_TYPES.KNOWLEDGE_SCHEDULE_RECORDED,
    eventVersion: EVENT_VERSIONS[EVENT_TYPES.KNOWLEDGE_SCHEDULE_RECORDED],
    payload: {
      vehicleId,
      documentId: "doc-1",
      manualTitle: "Manual",
      recordedAt: "2026-01-01T00:00:00.000Z",
      entries: [
        {
          entryId: "engine-oil",
          serviceName: "Engine oil",
          intervalMiles: 5_000,
          intervalMonths: 12,
          sourceDocumentId: "doc-1",
        },
      ],
    },
  });

  for (const [index, mileage] of [10_000, 13_000, 16_000].entries()) {
    await eventStore.append({
      aggregateType: "vehicle",
      aggregateId: vehicleId,
      eventType: EVENT_TYPES.SERVICE_RECORDED,
      eventVersion: EVENT_VERSIONS[EVENT_TYPES.SERVICE_RECORDED],
      payload: {
        vehicleId,
        serviceId: `svc-${index + 1}`,
        shop: "Dealer",
        serviceDate: `2024-0${index + 1}-01`,
        mileage,
        lineItems: ["Oil and filter changed"],
        total: "$80",
        evidenceIds: [],
        source: "carfax_import",
      },
    });
  }
};

describe("ensureIntervalVerificationPrompts", () => {
  it("creates VERIFY_OWNER_INTERVAL tasks for stable owner cadence", async () => {
    const eventStore = new InMemoryEventStore();
    await seedOilHistory(eventStore);

    const result = await ensureIntervalVerificationPrompts({
      eventStore,
      vehicleId,
    });

    expect(result.createdCount).toBe(1);
    const pending = result.nowQueue.filter((item) => item.status === "pending");
    expect(pending).toHaveLength(1);
    expect(pending[0]?.verificationCode).toBe("VERIFY_OWNER_INTERVAL");
    expect(pending[0]?.ruleId).toBe(intervalRuleIdForEntry("engine-oil"));
    expect(pending[0]?.suggestedIntervalMiles).toBe(3_000);
  });

  it("skips when overlay already confirmed", async () => {
    const eventStore = new InMemoryEventStore();
    await seedOilHistory(eventStore);

    const result = await ensureIntervalVerificationPrompts({
      eventStore,
      vehicleId,
      ownerContextMemory: {
        intervalOverlays: {
          "engine-oil": {
            intervalMiles: 3_000,
            label: "Every 3,000 mi",
            confirmedAt: "2026-07-27T00:00:00.000Z",
          },
        },
      },
    });

    expect(result.createdCount).toBe(0);
  });
});
