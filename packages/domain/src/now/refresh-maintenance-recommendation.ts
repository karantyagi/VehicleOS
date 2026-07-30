import { EVENT_TYPES, EVENT_VERSIONS, type CatalogDomainEvent } from "../events/catalog.js";
import { decideTask } from "../golden-path/service-loop.js";
import { foldEvents } from "../projections/apply.js";
import type { EventStore } from "../ports/event-store.js";
import type { PolicyEngine } from "../policy/policy-engine.js";
import type { MaintenanceRecommendation } from "../policy/types.js";
import { enrichRecommendationReason } from "../owner-context/enrich-recommendation-reason.js";
import type { OwnerContextMemory } from "../owner-context/types.js";
import type { DrivingStyle } from "../schedule/resolve-schedule-projection-context.js";
import {
  buildTimeFirstTaskCopy,
  matchScheduleRowForRule,
  projectScheduleRowsForRecommendations,
} from "./prepare-recommendation-task.js";

export type RefreshMaintenanceRecommendationInput = {
  eventStore: EventStore;
  policyEngine: PolicyEngine;
  vehicleId: string;
  ownerContextMemory?: OwnerContextMemory | null;
  drivingStyle?: DrivingStyle | null;
};

export type RefreshMaintenanceRecommendationResult = {
  created: boolean;
  dismissedStaleCount?: number;
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

const RECOMMENDATION_INPUT_EVENT_TYPES = new Set<CatalogDomainEvent["eventType"]>([
  EVENT_TYPES.SERVICE_RECORDED,
  EVENT_TYPES.SERVICE_UPDATED,
  EVENT_TYPES.SERVICE_MERGED,
  EVENT_TYPES.KNOWLEDGE_SCHEDULE_RECORDED,
]);

const hasRecommendationInputChangedAfterDismissal = (
  events: CatalogDomainEvent[],
  taskId: string,
): boolean => {
  let dismissalIndex = -1;
  events.forEach((event, index) => {
    if (
      event.eventType === EVENT_TYPES.TASK_DECIDED &&
      event.payload.taskId === taskId &&
      event.payload.decision === "dismiss"
    ) {
      dismissalIndex = index;
    }
  });
  if (dismissalIndex < 0) return false;

  return events
    .slice(dismissalIndex + 1)
    .some((event) => RECOMMENDATION_INPUT_EVENT_TYPES.has(event.eventType));
};

const dismissStaleKnowledgeReminders = async (input: {
  eventStore: EventStore;
  vehicleId: string;
  state: ReturnType<typeof foldEvents>;
  drivingStyle?: DrivingStyle | null;
}): Promise<number> => {
  const scheduleRows = projectScheduleRowsForRecommendations({
    state: input.state,
    drivingStyle: input.drivingStyle,
  });

  const staleTasks = input.state.nowQueue.filter((item) => {
    if (item.status !== "pending" || item.taskKind === "verification") return false;
    const row = matchScheduleRowForRule(item.ruleId, scheduleRows);
    return Boolean(item.ruleId?.startsWith("knowledge.policy.") && row?.status === "upcoming");
  });

  for (const task of staleTasks) {
    await decideTask({
      eventStore: input.eventStore,
      vehicleId: input.vehicleId,
      taskId: task.taskId,
      decision: "dismiss",
    });
  }

  return staleTasks.length;
};

export const refreshMaintenanceRecommendation = async (
  input: RefreshMaintenanceRecommendationInput,
): Promise<RefreshMaintenanceRecommendationResult> => {
  let events = await loadVehicleEvents(input.eventStore, input.vehicleId);
  let state = foldEvents(input.vehicleId, events);
  const dismissedStaleCount = await dismissStaleKnowledgeReminders({
    eventStore: input.eventStore,
    vehicleId: input.vehicleId,
    state,
    drivingStyle: input.drivingStyle,
  });

  if (dismissedStaleCount > 0) {
    events = await loadVehicleEvents(input.eventStore, input.vehicleId);
    state = foldEvents(input.vehicleId, events);
  }

  const evaluated = input.policyEngine.evaluate({
    vehicleId: input.vehicleId,
    state,
  });
  const recommendation = evaluated
    ? enrichRecommendationReason({
        recommendation: evaluated,
        ownerContextMemory: input.ownerContextMemory,
        drivingStyle: input.drivingStyle,
      })
    : null;

  if (!recommendation) {
    return {
      created: false,
      dismissedStaleCount,
      skippedReason: "none_due",
      recommendation: null,
      nowQueue: state.nowQueue,
    };
  }

  const hasBlockingSameRule = state.nowQueue.some(
    (item) =>
      item.ruleId === recommendation.ruleId &&
      (item.status === "pending" ||
        item.status === "snoozed" ||
        item.status === "scheduled" ||
        (item.status === "dismissed" &&
          !hasRecommendationInputChangedAfterDismissal(events, item.taskId))),
  );

  if (hasBlockingSameRule) {
    return {
      created: false,
      dismissedStaleCount,
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
  const scheduleRows = projectScheduleRowsForRecommendations({
    state,
    drivingStyle: input.drivingStyle,
  });
  const taskCopy = buildTimeFirstTaskCopy({ recommendation, scheduleRows });

  await input.eventStore.append({
    aggregateType: "task",
    aggregateId: taskId,
    eventType: EVENT_TYPES.TASK_CREATED,
    eventVersion: EVENT_VERSIONS[EVENT_TYPES.TASK_CREATED],
    payload: {
      vehicleId: input.vehicleId,
      taskId,
      recommendationId: recommendation.recommendationId,
      title: taskCopy.title,
      reason: taskCopy.reason,
      status: "pending",
      taskKind: "recommendation",
      ruleId: recommendation.ruleId,
      dueBy: taskCopy.dueBy,
    },
    causationId: recommendationEvent.id,
    correlationId,
  });

  const nextEvents = await loadVehicleEvents(input.eventStore, input.vehicleId);

  return {
    created: true,
    dismissedStaleCount,
    recommendation,
    nowQueue: foldEvents(input.vehicleId, nextEvents).nowQueue,
  };
};
