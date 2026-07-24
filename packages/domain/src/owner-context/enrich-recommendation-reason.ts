import type { DrivingStyle } from "../schedule/resolve-schedule-projection-context.js";
import type { MaintenanceRecommendation } from "../policy/types.js";
import { hasOwnerContextMemory } from "./normalize-owner-context.js";
import type { OwnerContextMemory } from "./types.js";

export type EnrichRecommendationInput = {
  recommendation: MaintenanceRecommendation;
  ownerContextMemory?: OwnerContextMemory | null;
  drivingStyle?: DrivingStyle | null;
};

const isWearItemRecommendation = (recommendation: MaintenanceRecommendation): boolean =>
  /tire|brake|suspension|alignment|rotor|pad|fluid|filter|oil/i.test(
    `${recommendation.title} ${recommendation.reason}`,
  );

export const enrichRecommendationReason = (
  input: EnrichRecommendationInput,
): MaintenanceRecommendation => {
  const context = input.ownerContextMemory ?? {};
  const snippets: string[] = [];

  if (context.primaryCity) {
    snippets.push(`Driving in ${context.primaryCity}`);
  }

  if (context.climateNotes?.length) {
    snippets.push(context.climateNotes.join("; "));
  }

  if (context.lastTireProduct && isWearItemRecommendation(input.recommendation)) {
    snippets.push(`Last tires on file: ${context.lastTireProduct}`);
  }

  if (input.drivingStyle === "aggressive" && isWearItemRecommendation(input.recommendation)) {
    snippets.push("Aggressive driving profile — surfacing wear items earlier");
  }

  if (context.ownerStatedPriorities?.length) {
    snippets.push(`Owner priority: ${context.ownerStatedPriorities[0]}`);
  }

  if (snippets.length === 0 && !hasOwnerContextMemory(context) && !input.drivingStyle) {
    return input.recommendation;
  }

  if (snippets.length === 0) return input.recommendation;

  return {
    ...input.recommendation,
    reason: `${input.recommendation.reason} Context: ${snippets.join(" · ")}.`,
  };
};
