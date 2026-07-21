import { describe, expect, it } from "vitest";
import { InMemoryEventStore, StubPolicyEngine, recordServiceAndRecommend } from "../index.js";
import { evaluateKnowledgeDue } from "./evaluate-knowledge-due.js";
import { recordKnowledgeSchedule } from "./record-knowledge-schedule.js";
import { stubExtractManualSchedule } from "./stub-extract-manual-schedule.js";
import { createEmptyVehicleState } from "../projections/types.js";

describe("stubExtractManualSchedule", () => {
  it("returns reviewable OEM-style interval rows", () => {
    const draft = stubExtractManualSchedule({ year: 2019, make: "Honda", model: "Civic" });
    expect(draft.entries.length).toBeGreaterThan(0);
    expect(draft.manualTitle).toContain("Honda");
  });
});

describe("evaluateKnowledgeDue", () => {
  it("flags OEM oil interval from knowledge base mileage", () => {
    const state = createEmptyVehicleState("veh-1");
    state.currentMileage = 12_000;
    state.knowledgeSchedule = [
      {
        entryId: "kb-1",
        serviceName: "Engine oil & filter",
        intervalMiles: 5_000,
        sourceDocumentId: "doc-1",
        manualTitle: "2019 Honda Civic maintenance schedule",
        recordedAt: "2026-07-21T00:00:00.000Z",
      },
    ];

    const recommendation = evaluateKnowledgeDue(state);
    expect(recommendation?.ruleId).toBe("knowledge.policy.kb-1.v1");
    expect(recommendation?.title).toContain("Engine oil");
  });
});

describe("recordKnowledgeSchedule", () => {
  it("stores manual in vault, records KB rows, and opens a Now task when due", async () => {
    const eventStore = new InMemoryEventStore();
    const vehicleId = crypto.randomUUID();

    await recordServiceAndRecommend({
      eventStore,
      policyEngine: new StubPolicyEngine(),
      input: {
        vehicleId,
        shop: "Dealer",
        serviceDate: "2025-01-01",
        mileage: 10_000,
        lineItems: ["Inspection"],
        total: "$0.00",
        evidenceIds: ["doc-old"],
      },
    });

    const draft = stubExtractManualSchedule({ year: 2019, make: "Honda", model: "Civic" });
    const result = await recordKnowledgeSchedule({
      eventStore,
      policyEngine: new StubPolicyEngine(),
      vehicleId,
      storageKey: "user/veh/manual.pdf",
      manualTitle: draft.manualTitle,
      entries: draft.entries,
      currentMileage: 12_000,
    });

    expect(result.entriesRecorded).toBeGreaterThan(0);
    expect(result.knowledgeSchedule.length).toBeGreaterThan(0);
    expect(result.nowQueue.some((item) => item.ruleId?.startsWith("knowledge.policy."))).toBe(true);
  });
});
