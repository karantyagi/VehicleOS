import { describe, expect, it } from "vitest";
import { heuristicDraftDeviationReason } from "./draft-deviation-reason.js";

describe("heuristicDraftDeviationReason", () => {
  it("suggests winter salt for early rear brakes in Boston", () => {
    const draft = heuristicDraftDeviationReason({
      deviation: {
        entryId: "brake-pads-rear",
        serviceName: "Brake pads, rear",
        oemTiming: "early",
        performedDate: "2023-06-01",
        dueDate: "2024-01-01",
        baselineSource: "carfax",
        hasConfirmedPattern: false,
      },
      ownerContextMemory: { primaryCity: "Boston, MA" },
      timeline: [{ serviceId: "1", shop: "Dealer", serviceDate: "2023-06-01", mileage: 30_000, lineItems: ["Rear brake pads"], total: "$250", evidenceIds: [] }],
    });

    expect(draft.suggestedReasonId).toBe("winter_salt");
    expect(draft.confidence).toBeGreaterThan(0.8);
  });

  it("suggests deferred for late timing", () => {
    const draft = heuristicDraftDeviationReason({
      deviation: {
        entryId: "engine-oil",
        serviceName: "Engine oil & filter",
        oemTiming: "late",
        performedDate: "2024-06-01",
        dueDate: "2024-01-01",
        baselineSource: "receipt",
        hasConfirmedPattern: false,
      },
      timeline: [],
    });

    expect(draft.suggestedReasonId).toBe("deferred_intentionally");
  });
});
