import { EVENT_TYPES, EVENT_VERSIONS, type CatalogDomainEvent } from "../events/catalog.js";
import { foldEvents } from "../projections/apply.js";
import type { EventStore } from "../ports/event-store.js";
import type { MaintenanceRecommendation } from "../policy/types.js";
import {
  evaluateSeasonalPrompts,
  isSeasonalRuleId,
  seasonKeyForDate,
  type ClimateZone,
} from "./evaluate-seasonal-prompts.js";

export type RecordSeasonalPromptsInput = {
  eventStore: EventStore;
  vehicleId: string;
  climateZone?: ClimateZone;
  referenceDate?: string;
};

export type RecordSeasonalPromptsResult = {
  created: MaintenanceRecommendation[];
  skippedRuleIds: string[];
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

const recommendationRuleIdByTaskId = (events: CatalogDomainEvent[]): Map<string, string> => {
  const recommendationRules = new Map<string, string>();

  for (const event of events) {
    if (event.eventType !== EVENT_TYPES.MAINTENANCE_RECOMMENDATION_CREATED) continue;
    recommendationRules.set(event.payload.recommendationId, event.payload.ruleId);
  }

  const taskRules = new Map<string, string>();
  for (const event of events) {
    if (event.eventType !== EVENT_TYPES.TASK_CREATED) continue;
    const fromRecommendation = recommendationRules.get(event.payload.recommendationId);
    const ruleId = event.payload.ruleId ?? fromRecommendation;
    if (ruleId) taskRules.set(event.payload.taskId, ruleId);
  }

  return taskRules;
};

const wasHandledThisSeason = (
  events: CatalogDomainEvent[],
  ruleId: string,
  seasonKey: string,
  referenceDate: string,
): boolean => {
  const taskRuleIds = recommendationRuleIdByTaskId(events);
  const referenceYear = new Date(referenceDate).getUTCFullYear();

  for (const event of events) {
    if (event.eventType !== EVENT_TYPES.TASK_DECIDED) continue;

    const matchedRuleId = taskRuleIds.get(event.payload.taskId);
    if (matchedRuleId !== ruleId) continue;

    const decidedSeason = seasonKeyForDate(event.payload.decidedAt);
    const decidedYear = new Date(event.payload.decidedAt).getUTCFullYear();
    if (decidedSeason === seasonKey && decidedYear === referenceYear) return true;
  }

  return false;
};

const appendSeasonalTask = async (deps: {
  eventStore: EventStore;
  vehicleId: string;
  recommendation: MaintenanceRecommendation;
  correlationId: string;
}) => {
  const recommendationEvent = await deps.eventStore.append({
    aggregateType: "vehicle",
    aggregateId: deps.vehicleId,
    eventType: EVENT_TYPES.MAINTENANCE_RECOMMENDATION_CREATED,
    eventVersion: EVENT_VERSIONS[EVENT_TYPES.MAINTENANCE_RECOMMENDATION_CREATED],
    payload: {
      vehicleId: deps.vehicleId,
      recommendationId: deps.recommendation.recommendationId,
      title: deps.recommendation.title,
      reason: deps.recommendation.reason,
      confidence: deps.recommendation.confidence,
      evidenceIds: deps.recommendation.evidenceIds,
      ruleId: deps.recommendation.ruleId,
    },
    correlationId: deps.correlationId,
  });

  const taskId = crypto.randomUUID();
  await deps.eventStore.append({
    aggregateType: "task",
    aggregateId: taskId,
    eventType: EVENT_TYPES.TASK_CREATED,
    eventVersion: EVENT_VERSIONS[EVENT_TYPES.TASK_CREATED],
    payload: {
      vehicleId: deps.vehicleId,
      taskId,
      recommendationId: deps.recommendation.recommendationId,
      title: deps.recommendation.title,
      reason: deps.recommendation.reason,
      status: "pending",
      taskKind: "recommendation",
      ruleId: deps.recommendation.ruleId,
    },
    causationId: recommendationEvent.id,
    correlationId: deps.correlationId,
  });
};

export const recordSeasonalPrompts = async (
  input: RecordSeasonalPromptsInput,
): Promise<RecordSeasonalPromptsResult> => {
  const referenceDate = input.referenceDate ?? new Date().toISOString();
  const seasonKey = seasonKeyForDate(referenceDate);
  const events = await loadVehicleEvents(input.eventStore, input.vehicleId);
  const state = foldEvents(input.vehicleId, events);
  const prompts = evaluateSeasonalPrompts({
    state,
    climateZone: input.climateZone,
    referenceDate,
  });

  const created: MaintenanceRecommendation[] = [];
  const skippedRuleIds: string[] = [];

  for (const prompt of prompts) {
    const pendingDuplicate = state.nowQueue.some(
      (item) => item.ruleId === prompt.ruleId && item.status === "pending",
    );
    if (pendingDuplicate) {
      skippedRuleIds.push(prompt.ruleId);
      continue;
    }

    if (wasHandledThisSeason(events, prompt.ruleId, seasonKey, referenceDate)) {
      skippedRuleIds.push(prompt.ruleId);
      continue;
    }

    await appendSeasonalTask({
      eventStore: input.eventStore,
      vehicleId: input.vehicleId,
      recommendation: prompt,
      correlationId: crypto.randomUUID(),
    });
    created.push(prompt);
  }

  const nextEvents = await loadVehicleEvents(input.eventStore, input.vehicleId);

  return {
    created,
    skippedRuleIds,
    nowQueue: foldEvents(input.vehicleId, nextEvents).nowQueue,
  };
};

export { isSeasonalRuleId };
