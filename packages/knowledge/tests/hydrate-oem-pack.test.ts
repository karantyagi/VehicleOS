import { describe, expect, it } from "vitest";
import { InMemoryEventStore, StubPolicyEngine, recordKnowledgeSchedule } from "@vehicleos/domain";
import { hydrateOemKnowledgePack } from "../src/hydrate-oem-pack.js";

describe("hydrateOemKnowledgePack", () => {
  it("hydrates auto_verified 2021 TLX pack on first vehicle create", async () => {
    const eventStore = new InMemoryEventStore();
    const policyEngine = new StubPolicyEngine();
    const vehicleId = crypto.randomUUID();

    const result = await hydrateOemKnowledgePack({
      eventStore,
      policyEngine,
      vehicle: {
        id: vehicleId,
        year: 2021,
        make: "Acura",
        model: "TLX",
        trim: "SH-AWD",
        currentMileage: 58_819,
      },
    });

    expect(result).toEqual({
      hydrated: true,
      packId: "acura-tlx-2021-sh-awd",
      entriesRecorded: expect.any(Number),
      upgradedFromStub: false,
    });
    expect(result.entriesRecorded).toBeGreaterThanOrEqual(10);

    const secondPass = await hydrateOemKnowledgePack({
      eventStore,
      policyEngine,
      vehicle: {
        id: vehicleId,
        year: 2021,
        make: "Acura",
        model: "TLX",
        trim: "SH-AWD",
        currentMileage: 58_819,
      },
    });

    expect(secondPass).toEqual({
      hydrated: false,
      packId: "acura-tlx-2021-sh-awd",
      skippedReason: "already_hydrated",
    });
  });

  it("upgrades stub schedule when fewer than verified pack rows exist", async () => {
    const eventStore = new InMemoryEventStore();
    const policyEngine = new StubPolicyEngine();
    const vehicleId = crypto.randomUUID();

    await recordKnowledgeSchedule({
      eventStore,
      policyEngine,
      vehicleId,
      storageKey: "stub",
      manualTitle: "Stub",
      entries: [
        {
          entryId: "code-b",
          serviceName: "Oil",
          intervalMiles: 5000,
          intervalMonths: 6,
          ruleId: "knowledge.policy.code-b.v1",
        },
        {
          entryId: "mm-sub-1",
          serviceName: "Tires",
          intervalMiles: 7500,
          intervalMonths: 12,
          ruleId: "knowledge.policy.mm-sub-1.v1",
        },
      ],
      currentMileage: 59_000,
      openRecommendationIfDue: false,
    });

    const result = await hydrateOemKnowledgePack({
      eventStore,
      policyEngine,
      vehicle: {
        id: vehicleId,
        year: 2021,
        make: "Acura",
        model: "TLX",
        trim: "Technology SH-AWD",
        currentMileage: 59_000,
      },
    });

    expect(result.hydrated).toBe(true);
    expect(result.upgradedFromStub).toBe(true);
    expect(result.entriesRecorded).toBeGreaterThanOrEqual(10);
  });

  it("hydrates promoted Honda Accord pack in interview fleet", async () => {
    const eventStore = new InMemoryEventStore();
    const policyEngine = new StubPolicyEngine();

    const result = await hydrateOemKnowledgePack({
      eventStore,
      policyEngine,
      vehicle: {
        id: crypto.randomUUID(),
        year: 2025,
        make: "Honda",
        model: "Accord",
        trim: "EX",
        currentMileage: 12_000,
      },
    });

    expect(result).toEqual({
      hydrated: true,
      packId: "honda-accord-2024-ex",
      entriesRecorded: expect.any(Number),
      upgradedFromStub: false,
    });
    expect(result.entriesRecorded).toBeGreaterThanOrEqual(8);
  });

  it("returns unsupported for unknown vehicles", async () => {
    const result = await hydrateOemKnowledgePack({
      eventStore: new InMemoryEventStore(),
      policyEngine: new StubPolicyEngine(),
      vehicle: {
        id: crypto.randomUUID(),
        year: 2019,
        make: "Honda",
        model: "Civic",
        trim: "EX",
        currentMileage: 41_800,
      },
    });

    expect(result).toEqual({
      hydrated: false,
      skippedReason: "unsupported",
    });
  });
});
