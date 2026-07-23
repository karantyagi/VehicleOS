import type { MaintenanceRecommendation } from "../policy/types.js";
import type { VehicleProjectionState } from "../projections/types.js";
import { findLastMatchingService } from "./match-service-name.js";

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
