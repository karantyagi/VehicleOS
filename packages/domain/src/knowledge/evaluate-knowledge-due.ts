import type { MaintenanceRecommendation } from "../policy/types.js";
import type { ServiceTimelineEntry, VehicleProjectionState } from "../projections/types.js";

const servicePattern = (serviceName: string): RegExp => {
  const normalized = serviceName.toLowerCase();
  if (normalized.includes("oil")) return /oil change|oil & filter|engine oil|synthetic oil/i;
  if (normalized.includes("tire")) return /tire rotation|rotate tires/i;
  if (normalized.includes("cabin")) return /cabin filter|cabin air filter/i;
  if (normalized.includes("brake")) return /brake fluid|brake service|brakes/i;
  return new RegExp(normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
};

const findLastMatchingService = (
  timeline: ServiceTimelineEntry[],
  serviceName: string,
): ServiceTimelineEntry | undefined =>
  [...timeline].reverse().find((entry) =>
    entry.lineItems.some((line) => servicePattern(serviceName).test(line)),
  );

export const evaluateKnowledgeDue = (
  state: VehicleProjectionState,
): MaintenanceRecommendation | null => {
  if (state.knowledgeSchedule.length === 0) return null;

  for (const entry of state.knowledgeSchedule) {
    if (!entry.intervalMiles) continue;

    const lastMatch = findLastMatchingService(state.timeline, entry.serviceName);
    const baselineMileage = lastMatch?.mileage ?? 0;
    const milesSince = Math.max(0, state.currentMileage - baselineMileage);

    if (milesSince < entry.intervalMiles) continue;

    const pageHint = entry.sourcePage ? ` (${entry.sourcePage})` : "";

    return {
      recommendationId: crypto.randomUUID(),
      title: `${entry.serviceName} due`,
      reason: `OEM schedule${pageHint}: every ${entry.intervalMiles.toLocaleString()} mi. ${milesSince.toLocaleString()} miles since last recorded ${entry.serviceName.toLowerCase()}.`,
      confidence: 0.93,
      evidenceIds: lastMatch?.evidenceIds ?? [entry.sourceDocumentId],
      ruleId: `knowledge.policy.${entry.entryId}.v1`,
    };
  }

  return null;
};
