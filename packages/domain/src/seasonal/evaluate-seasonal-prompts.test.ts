import { describe, expect, it } from "vitest";
import { InMemoryEventStore, recordServiceAndRecommend, StubPolicyEngine } from "../index.js";
import {
  evaluateSeasonalPrompts,
  seasonKeyForDate,
  type ClimateZone,
} from "./evaluate-seasonal-prompts.js";
import { recordSeasonalPrompts } from "./record-seasonal-prompts.js";
import { createEmptyVehicleState } from "../projections/types.js";

describe("evaluateSeasonalPrompts", () => {
  it("returns winter prep for cold climates in January", () => {
    const prompts = evaluateSeasonalPrompts({
      state: createEmptyVehicleState("veh-1"),
      climateZone: "cold",
      referenceDate: "2026-01-15T12:00:00.000Z",
    });

    expect(prompts.some((prompt) => prompt.ruleId === "seasonal.policy.winter_prep.v1")).toBe(true);
  });

  it("returns summer AC prompt for hot climates in July", () => {
    const prompts = evaluateSeasonalPrompts({
      state: createEmptyVehicleState("veh-1"),
      climateZone: "hot",
      referenceDate: "2026-07-15T12:00:00.000Z",
    });

    expect(prompts.some((prompt) => prompt.ruleId === "seasonal.policy.summer_ac.v1")).toBe(true);
  });

  it("maps months into season keys", () => {
    expect(seasonKeyForDate("2026-01-15T12:00:00.000Z")).toBe("winter");
    expect(seasonKeyForDate("2026-07-15T12:00:00.000Z")).toBe("summer");
  });
});

describe("recordSeasonalPrompts", () => {
  it("creates a seasonal Now queue task once per season", async () => {
    const eventStore = new InMemoryEventStore();
    const vehicleId = crypto.randomUUID();
    const referenceDate = "2026-01-15T12:00:00.000Z";

    await recordServiceAndRecommend({
      eventStore,
      policyEngine: new StubPolicyEngine(),
      input: {
        vehicleId,
        shop: "Dealer",
        serviceDate: "2025-12-01",
        mileage: 40_000,
        lineItems: ["Oil change"],
        total: "$79.00",
        evidenceIds: ["doc-1"],
      },
    });

    const first = await recordSeasonalPrompts({
      eventStore,
      vehicleId,
      climateZone: "cold",
      referenceDate,
    });

    expect(first.created.length).toBeGreaterThan(0);
    expect(first.nowQueue.some((item) => item.ruleId?.startsWith("seasonal.policy."))).toBe(true);

    const second = await recordSeasonalPrompts({
      eventStore,
      vehicleId,
      climateZone: "cold",
      referenceDate,
    });

    expect(second.created).toHaveLength(0);
    expect(second.skippedRuleIds.length).toBeGreaterThan(0);
  });
});
