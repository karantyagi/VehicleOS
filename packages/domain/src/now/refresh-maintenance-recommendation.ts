import { EVENT_TYPES, EVENT_VERSIONS, type CatalogDomainEvent } from "../events/catalog.js";
import { foldEvents } from "../projections/apply.js";
import type { EventStore } from "../ports/event-store.js";
import type { PolicyEngine } from "../policy/policy-engine.js";
import type { MaintenanceRecommendation } from "../policy/types.js";

export type RefreshMaintenanceRecommendationInput = {
  eventStore: EventStore;
  policyEngine: PolicyEngine;
  vehicleId: string;
};

export type RefreshMaintenanceRecommendationResult = {
  created: boolean;
  skippedReason?: "none_due" | "already_pending";
  recommendation: MaintenanceRecommendation | null;
  nowQueue: ReturnType<typeof foldEvents>["nowQueue"];
};

const loadVehicleEvents = async (
  eventStore: EventStore,
  vehicleId: string,
): Promise<CatalogDomainEvent[]> => {
  if ("loadForVehicle" in eventStore && typeof eventStore.loadForVehicle === "function") {
    return eventStore.loadForVehicle(vehicleId);
  }

  const allEvents = await eventStore.loadAll();
  return allEvents.filter(
    (event) => "vehicleId" in event.payload && event.payload.vehicleId === vehicleId,
  );
};

export const refreshMaintenanceRecommendation = async (
  input: RefreshMaintenanceRecommendationInput,
): Promise<RefreshMaintenanceRecommendationResult> => {
  const events = await loadVehicleEvents(input.eventStore, input.vehicleId);
  const state = foldEvents(input.vehicleId, events);
  const recommendation = input.policyEngine.evaluate({
    vehicleId: input.vehicleId,
    state,
  });

  if (!recommendation) {
    return {
      created: false,
      skippedReason: "none_due",
      recommendation: null,
      nowQueue: state.nowQueue,
    };
  }

  const hasPendingSameRule = state.nowQueue.some(
    (item) => item.status === "pending" && item.ruleId === recommendation.ruleId,
  );

  if (hasPendingSameRule) {
    return {
      created: false,
      skippedReason: "already_pending",
      recommendation: null,
      nowQueue: state.nowQueue,
    };
  }

  const correlationId = crypto.randomUUID();

  const recommendationEvent = await input.eventStore.append({
    aggregateType: "vehicle",
    aggregateId: input.vehicleId,
    eventType: EVENT_TYPES.MAINTENANCE_RECOMMENDATION_CREATED,
    eventVersion: EVENT_VERSIONS[EVENT_TYPES.MAINTENANCE_RECOMMENDATION_CREATED],
    payload: {
      vehicleId: input.vehicleId,
      recommendationId: recommendation.recommendationId,
      title: recommendation.title,
      reason: recommendation.reason,
      confidence: recommendation.confidence,
      evidenceIds: recommendation.evidenceIds,
      ruleId: recommendation.ruleId,
    },
    correlationId,
  });

  const taskId = crypto.randomUUID();
  await input.eventStore.append({
    aggregateType: "task",
    aggregateId: taskId,
    eventType: EVENT_TYPES.TASK_CREATED,
    eventVersion: EVENT_VERSIONS[EVENT_TYPES.TASK_CREATED],
    payload: {
      vehicleId: input.vehicleId,
      taskId,
      recommendationId: recommendation.recommendationId,
      title: recommendation.title,
      reason: recommendation.reason,
      status: "pending",
      taskKind: "recommendation",
      ruleId: recommendation.ruleId,
    },
    causationId: recommendationEvent.id,
    correlationId,
  });

  const nextEvents = await loadVehicleEvents(input.eventStore, input.vehicleId);

  return {
    created: true,
    recommendation,
    nowQueue: foldEvents(input.vehicleId, nextEvents).nowQueue,
  };
};
