import { describe, expect, it } from "vitest";
import { InMemoryEventStore, StubPolicyEngine } from "@vehicleos/domain";
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
    });
    expect(result.entriesRecorded).toBeGreaterThan(0);

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

  it("hydrates promoted Kia K5 pack after Phase C", async () => {
    const eventStore = new InMemoryEventStore();
    const policyEngine = new StubPolicyEngine();

    const result = await hydrateOemKnowledgePack({
      eventStore,
      policyEngine,
      vehicle: {
        id: crypto.randomUUID(),
        year: 2024,
        make: "Kia",
        model: "K5",
        trim: "LXS",
        currentMileage: 12_000,
      },
    });

    expect(result).toEqual({
      hydrated: true,
      packId: "kia-k5-2024-lxs",
      entriesRecorded: 4,
    });
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
