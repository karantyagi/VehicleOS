import { describe, expect, it } from "vitest";
import { enrichRecommendationReason } from "./enrich-recommendation-reason.js";

describe("enrichRecommendationReason", () => {
  it("returns the base recommendation when no context is present", () => {
    const recommendation = {
      recommendationId: "rec-1",
      title: "Oil change due",
      reason: "5,200 miles since last oil change.",
      confidence: 0.95,
      evidenceIds: ["ev-1"],
      ruleId: "schedule.policy.oil_change.v1",
    };

    expect(enrichRecommendationReason({ recommendation })).toEqual(recommendation);
  });

  it("adds owner context snippets to recommendation copy", () => {
    const enriched = enrichRecommendationReason({
      recommendation: {
        recommendationId: "rec-1",
        title: "Tire rotation",
        reason: "3,500 miles since last logged service.",
        confidence: 0.85,
        evidenceIds: ["ev-1"],
        ruleId: "schedule.policy.tire_rotation.v1",
      },
      ownerContextMemory: {
        primaryCity: "Boston",
        climateNotes: ["heavy winter salt"],
        lastTireProduct: "Michelin Pilot Sport 4S",
        ownerStatedPriorities: ["Keep brakes quiet"],
      },
      drivingStyle: "aggressive",
    });

    expect(enriched.reason).toContain("Driving in Boston");
    expect(enriched.reason).toContain("heavy winter salt");
    expect(enriched.reason).toContain("Michelin Pilot Sport 4S");
    expect(enriched.reason).toContain("Aggressive driving profile");
    expect(enriched.reason).toContain("Owner priority: Keep brakes quiet");
  });
});
