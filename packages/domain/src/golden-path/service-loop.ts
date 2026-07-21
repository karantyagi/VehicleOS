import { EVENT_TYPES, EVENT_VERSIONS } from "../events/catalog.js";
import type { CatalogDomainEvent } from "../events/catalog.js";
import { detectServiceConflict } from "../conflicts/detect-service-conflict.js";
import { foldEvents } from "../projections/apply.js";
import type { PolicyEngine } from "../policy/policy-engine.js";
import type { EventStore } from "../ports/event-store.js";
import type { ServiceRecordSource, TaskDecision } from "../events/catalog.js";

export type RecordServiceInput = {
  vehicleId: string;
  serviceId?: string;
  shop: string;
  serviceDate: string;
  mileage: number;
  lineItems: string[];
  total: string;
  evidenceIds: string[];
  documentId?: string;
  correlationId?: string;
  source?: ServiceRecordSource;
};

export type GoldenPathResult = {
  events: CatalogDomainEvent[];
  state: ReturnType<typeof foldEvents>;
  recommendation: {
    recommendationId: string;
    title: string;
    reason: string;
    confidence: number;
    evidenceIds: string[];
    ruleId: string;
  } | null;
  task: {
    taskId: string;
    recommendationId: string;
    title: string;
    reason: string;
    status: "pending";
  } | null;
};

const eventsForVehicle = (events: CatalogDomainEvent[], vehicleId: string): CatalogDomainEvent[] =>
  events.filter(
    (event) => "vehicleId" in event.payload && event.payload.vehicleId === vehicleId,
  );

export const recordServiceAndRecommend = async (deps: {
  eventStore: EventStore;
  policyEngine: PolicyEngine;
  input: RecordServiceInput;
}): Promise<GoldenPathResult> => {
  const { eventStore, policyEngine, input } = deps;
  const serviceId = input.serviceId ?? crypto.randomUUID();
  const correlationId = input.correlationId ?? crypto.randomUUID();

  await eventStore.append({
    aggregateType: "vehicle",
    aggregateId: input.vehicleId,
    eventType: EVENT_TYPES.SERVICE_RECORDED,
    eventVersion: EVENT_VERSIONS[EVENT_TYPES.SERVICE_RECORDED],
    payload: {
      vehicleId: input.vehicleId,
      serviceId,
      shop: input.shop,
      serviceDate: input.serviceDate,
      mileage: input.mileage,
      lineItems: input.lineItems,
      total: input.total,
      evidenceIds: input.evidenceIds,
      documentId: input.documentId,
      source: input.source,
    },
    correlationId,
  });

  const vehicleEvents = eventsForVehicle(await eventStore.loadAll(), input.vehicleId);
  const state = foldEvents(input.vehicleId, vehicleEvents);
  const recommendation = policyEngine.evaluate({ vehicleId: input.vehicleId, state });

  let task: GoldenPathResult["task"] = null;

  if (recommendation) {
    const recommendationEvent = await eventStore.append({
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
      causationId: serviceId,
      correlationId,
    });

    const taskId = crypto.randomUUID();
    await eventStore.append({
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

    task = {
      taskId,
      recommendationId: recommendation.recommendationId,
      title: recommendation.title,
      reason: recommendation.reason,
      status: "pending",
    };
  }

  const events = eventsForVehicle(await eventStore.loadAll(), input.vehicleId);

  return {
    events,
    state: foldEvents(input.vehicleId, events),
    recommendation,
    task,
  };
};

export const decideTask = async (deps: {
  eventStore: EventStore;
  vehicleId: string;
  taskId: string;
  decision: TaskDecision;
}): Promise<CatalogDomainEvent> => {
  const decided = await deps.eventStore.append({
    aggregateType: "task",
    aggregateId: deps.taskId,
    eventType: EVENT_TYPES.TASK_DECIDED,
    eventVersion: EVENT_VERSIONS[EVENT_TYPES.TASK_DECIDED],
    payload: {
      vehicleId: deps.vehicleId,
      taskId: deps.taskId,
      decision: deps.decision,
      decidedAt: new Date().toISOString(),
    },
  });

  return decided as CatalogDomainEvent;
};

export type ServiceConfirmResult =
  | { conflict: false; result: GoldenPathResult }
  | {
      conflict: true;
      conflictId: string;
      taskId: string;
      state: ReturnType<typeof foldEvents>;
      events: CatalogDomainEvent[];
    };

export const confirmServiceWithConflictCheck = async (deps: {
  eventStore: EventStore;
  policyEngine: PolicyEngine;
  input: RecordServiceInput;
}): Promise<ServiceConfirmResult> => {
  const { eventStore, policyEngine, input } = deps;
  const vehicleEvents = eventsForVehicle(await eventStore.loadAll(), input.vehicleId);
  const state = foldEvents(input.vehicleId, vehicleEvents);
  const conflict = detectServiceConflict(state, {
    mileage: input.mileage,
    serviceDate: input.serviceDate,
  });

  if (!conflict) {
    return {
      conflict: false,
      result: await recordServiceAndRecommend({ eventStore, policyEngine, input }),
    };
  }

  const conflictId = crypto.randomUUID();
  const taskId = crypto.randomUUID();
  const correlationId = input.correlationId ?? crypto.randomUUID();

  await eventStore.append({
    aggregateType: "vehicle",
    aggregateId: input.vehicleId,
    eventType: EVENT_TYPES.CONFLICT_DETECTED,
    eventVersion: EVENT_VERSIONS[EVENT_TYPES.CONFLICT_DETECTED],
    payload: {
      vehicleId: input.vehicleId,
      conflictId,
      kind: conflict.kind,
      message: conflict.message,
      incomingMileage: conflict.incomingMileage,
      incomingServiceDate: conflict.incomingServiceDate,
      currentMileage: conflict.currentMileage,
      lastServiceDate: conflict.lastServiceDate,
    },
    correlationId,
  });

  await eventStore.append({
    aggregateType: "task",
    aggregateId: taskId,
    eventType: EVENT_TYPES.TASK_CREATED,
    eventVersion: EVENT_VERSIONS[EVENT_TYPES.TASK_CREATED],
    payload: {
      vehicleId: input.vehicleId,
      taskId,
      recommendationId: conflictId,
      title:
        conflict.verificationCode === "VERIFY_ODOMETER"
          ? "Verify odometer reading"
          : "Verify service date",
      reason: conflict.message,
      status: "pending",
      taskKind: "verification",
      verificationCode: conflict.verificationCode,
    },
    correlationId,
  });

  const events = eventsForVehicle(await eventStore.loadAll(), input.vehicleId);

  return {
    conflict: true,
    conflictId,
    taskId,
    state: foldEvents(input.vehicleId, events),
    events,
  };
};
