import { describe, expect, it } from "vitest";
import { InMemoryEventStore } from "../adapters/in-memory-event-store.js";
import { EVENT_TYPES, EVENT_VERSIONS } from "../events/catalog.js";
import { ensureDeviationVerificationPrompts } from "./ensure-deviation-verification-prompts.js";
import { deviationRuleIdForEntry } from "../schedule/deviation-rule-id.js";

const vehicleId = "veh-1";

const seedKnowledgeAndTimeline = async (eventStore: InMemoryEventStore) => {
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
          entryId: "brake-pads-rear",
          serviceName: "Brake pads, rear",
          intervalMonths: 48,
          sourceDocumentId: "doc-1",
        },
      ],
    },
  });

  await eventStore.append({
    aggregateType: "vehicle",
    aggregateId: vehicleId,
    eventType: EVENT_TYPES.SERVICE_RECORDED,
    eventVersion: EVENT_VERSIONS[EVENT_TYPES.SERVICE_RECORDED],
    payload: {
      vehicleId,
      serviceId: "svc-1",
      shop: "Dealer",
      serviceDate: "2023-06-01",
      mileage: 30_000,
      lineItems: ["Brake pads, rear replaced"],
      total: "$250",
      evidenceIds: [],
      source: "carfax_import",
    },
  });
};

describe("ensureDeviationVerificationPrompts", () => {
  it("creates a verification task for unconfirmed early/late deviations", async () => {
    const eventStore = new InMemoryEventStore();
    await seedKnowledgeAndTimeline(eventStore);

    const result = await ensureDeviationVerificationPrompts({
      eventStore,
      vehicleId,
      ownedSince: "2020-01-01",
      today: "2026-07-27",
    });

    expect(result.createdCount).toBe(1);
    const pending = result.nowQueue.filter((item) => item.status === "pending");
    expect(pending).toHaveLength(1);
    expect(pending[0]?.verificationCode).toBe("VERIFY_MAINTENANCE_TIMING");
    expect(pending[0]?.ruleId).toBe(deviationRuleIdForEntry("brake-pads-rear"));
  });

  it("skips when pattern already confirmed", async () => {
    const eventStore = new InMemoryEventStore();
    await seedKnowledgeAndTimeline(eventStore);

    const first = await ensureDeviationVerificationPrompts({
      eventStore,
      vehicleId,
      ownedSince: "2020-01-01",
      today: "2026-07-27",
      ownerContextMemory: {
        maintenancePatterns: {
          "brake-pads-rear": {
            timing: "early",
            reason: "Winter road salt / corrosion",
            confirmedAt: "2026-07-27T00:00:00.000Z",
          },
        },
      },
    });

    expect(first.createdCount).toBe(0);
  });
});
