import { EVENT_TYPES, EVENT_VERSIONS, type CatalogDomainEvent } from "../events/catalog.js";
import { foldEvents } from "../projections/apply.js";
import type { PolicyEngine } from "../policy/policy-engine.js";
import type { EventStore } from "../ports/event-store.js";
import type { ManualScheduleDraftRow } from "./stub-extract-manual-schedule.js";

export type RecordKnowledgeScheduleInput = {
  eventStore: EventStore;
  policyEngine: PolicyEngine;
  vehicleId: string;
  storageKey: string;
  manualTitle: string;
  entries: ManualScheduleDraftRow[];
  currentMileage: number;
};

export type RecordKnowledgeScheduleResult = {
  documentId: string;
  manualTitle: string;
  entriesRecorded: number;
  recommendation: {
    recommendationId: string;
    title: string;
    reason: string;
    ruleId: string;
  } | null;
  task: {
    taskId: string;
    title: string;
    status: "pending";
  } | null;
  knowledgeSchedule: ReturnType<typeof foldEvents>["knowledgeSchedule"];
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

export const recordKnowledgeSchedule = async (
  input: RecordKnowledgeScheduleInput,
): Promise<RecordKnowledgeScheduleResult> => {
  const { eventStore, policyEngine, vehicleId } = input;
  const documentId = crypto.randomUUID();
  const correlationId = crypto.randomUUID();
  const recordedAt = new Date().toISOString();

  await eventStore.append({
    aggregateType: "document",
    aggregateId: documentId,
    eventType: EVENT_TYPES.DOCUMENT_INGESTED,
    eventVersion: EVENT_VERSIONS[EVENT_TYPES.DOCUMENT_INGESTED],
    payload: {
      vehicleId,
      documentId,
      channel: "manual",
      storageKey: input.storageKey,
    },
    correlationId,
  });

  const scheduleRows = input.entries.map((entry) => ({
    entryId: crypto.randomUUID(),
    serviceName: entry.serviceName,
    intervalMiles: entry.intervalMiles,
    intervalMonths: entry.intervalMonths,
    sourceDocumentId: documentId,
    sourcePage: entry.sourcePage,
  }));

  await eventStore.append({
    aggregateType: "vehicle",
    aggregateId: vehicleId,
    eventType: EVENT_TYPES.KNOWLEDGE_SCHEDULE_RECORDED,
    eventVersion: EVENT_VERSIONS[EVENT_TYPES.KNOWLEDGE_SCHEDULE_RECORDED],
    payload: {
      vehicleId,
      documentId,
      manualTitle: input.manualTitle,
      entries: scheduleRows,
      recordedAt,
    },
    causationId: documentId,
    correlationId,
  });

  const events = await loadVehicleEvents(eventStore, vehicleId);
  const state = foldEvents(vehicleId, events);
  const stateForPolicy = {
    ...state,
    currentMileage: Math.max(state.currentMileage, input.currentMileage),
  };
  const recommendation = policyEngine.evaluate({ vehicleId, state: stateForPolicy });

  let task: RecordKnowledgeScheduleResult["task"] = null;

  if (recommendation) {
    const recommendationEvent = await eventStore.append({
      aggregateType: "vehicle",
      aggregateId: vehicleId,
      eventType: EVENT_TYPES.MAINTENANCE_RECOMMENDATION_CREATED,
      eventVersion: EVENT_VERSIONS[EVENT_TYPES.MAINTENANCE_RECOMMENDATION_CREATED],
      payload: {
        vehicleId,
        recommendationId: recommendation.recommendationId,
        title: recommendation.title,
        reason: recommendation.reason,
        confidence: recommendation.confidence,
        evidenceIds: recommendation.evidenceIds,
        ruleId: recommendation.ruleId,
      },
      causationId: documentId,
      correlationId,
    });

    const taskId = crypto.randomUUID();
    await eventStore.append({
      aggregateType: "task",
      aggregateId: taskId,
      eventType: EVENT_TYPES.TASK_CREATED,
      eventVersion: EVENT_VERSIONS[EVENT_TYPES.TASK_CREATED],
      payload: {
        vehicleId,
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

    task = {
      taskId,
      title: recommendation.title,
      status: "pending",
    };
  }

  const nextEvents = await loadVehicleEvents(eventStore, vehicleId);
  const nextState = foldEvents(vehicleId, nextEvents);

  return {
    documentId,
    manualTitle: input.manualTitle,
    entriesRecorded: scheduleRows.length,
    recommendation: recommendation
      ? {
          recommendationId: recommendation.recommendationId,
          title: recommendation.title,
          reason: recommendation.reason,
          ruleId: recommendation.ruleId,
        }
      : null,
    task,
    knowledgeSchedule: nextState.knowledgeSchedule,
    nowQueue: nextState.nowQueue,
  };
};
