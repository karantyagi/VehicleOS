import { describe, expect, it } from "vitest";
import { detectOwnerHabitProposals } from "./detect-owner-habit-proposals.js";
import type { ServiceTimelineEntry } from "../projections/types.js";

const techronTimeline = (mileages: number[]): ServiceTimelineEntry[] =>
  mileages.map((mileage, index) => ({
    serviceId: `svc-${index}`,
    shop: "Owner",
    serviceDate: `2025-0${index + 1}-15`,
    mileage,
    lineItems: ["Chevron Techron fuel system cleaner added"],
    total: "$12.00",
    evidenceIds: [],
    source: "owner_note",
  }));

describe("detectOwnerHabitProposals", () => {
  it("proposes Techron cadence when spacing is stable", () => {
    const [proposal] = detectOwnerHabitProposals({
      timeline: techronTimeline([10_000, 13_000, 16_000]),
    });

    expect(proposal).toMatchObject({
      entryId: "owner-habit:techron",
      intervalMiles: 3_000,
      oemIntervalMiles: null,
    });
  });

  it("skips when overlay already confirmed", () => {
    const proposals = detectOwnerHabitProposals({
      timeline: techronTimeline([10_000, 13_000, 16_000]),
      ownerContextMemory: {
        intervalOverlays: {
          "owner-habit:techron": {
            intervalMiles: 3_000,
            label: "Every 3,000 mi",
            confirmedAt: "2026-07-27T00:00:00.000Z",
          },
        },
      },
    });

    expect(proposals).toHaveLength(0);
  });
});
