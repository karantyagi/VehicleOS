import { EVENT_TYPES, type CatalogDomainEvent } from "../events/catalog.js";
import {
  createEmptyVehicleState,
  type NowQueueItem,
  type ServiceTimelineEntry,
  type VehicleProjectionState,
} from "./types.js";

export { createEmptyVehicleState };

const taskStatusFromDecision = (
  decision: "approve" | "dismiss" | "snooze",
): NowQueueItem["status"] => {
  if (decision === "approve") return "approved";
  if (decision === "dismiss") return "dismissed";
  return "snoozed";
};

export const applyEvent = (
  state: VehicleProjectionState,
  event: CatalogDomainEvent,
): VehicleProjectionState => {
  switch (event.eventType) {
    case EVENT_TYPES.DOCUMENT_INGESTED:
      return {
        ...state,
        vehicleId: event.payload.vehicleId,
        evidenceVault: [
          ...state.evidenceVault,
          {
            documentId: event.payload.documentId,
            storageKey: event.payload.storageKey,
            channel: event.payload.channel,
            ingestedAt: event.createdAt,
            immutable: true,
          },
        ],
      };

    case EVENT_TYPES.SERVICE_RECORDED: {
      const entry: ServiceTimelineEntry = {
        serviceId: event.payload.serviceId,
        shop: event.payload.shop,
        serviceDate: event.payload.serviceDate,
        mileage: event.payload.mileage,
        lineItems: event.payload.lineItems,
        total: event.payload.total,
        evidenceIds: event.payload.evidenceIds,
      };

      return {
        ...state,
        vehicleId: event.payload.vehicleId,
        currentMileage: Math.max(state.currentMileage, event.payload.mileage),
        timeline: [...state.timeline, entry],
      };
    }

    case EVENT_TYPES.MAINTENANCE_RECOMMENDATION_CREATED:
      return state;

    case EVENT_TYPES.TASK_CREATED: {
      const queueItem: NowQueueItem = {
        taskId: event.payload.taskId,
        recommendationId: event.payload.recommendationId,
        title: event.payload.title,
        reason: event.payload.reason,
        status: event.payload.status,
        taskKind: event.payload.taskKind,
        verificationCode: event.payload.verificationCode,
        ruleId: event.payload.ruleId,
      };

      return {
        ...state,
        vehicleId: event.payload.vehicleId,
        nowQueue: [...state.nowQueue, queueItem],
      };
    }

    case EVENT_TYPES.TASK_DECIDED:
      return {
        ...state,
        nowQueue: state.nowQueue.map((item) =>
          item.taskId === event.payload.taskId
            ? { ...item, status: taskStatusFromDecision(event.payload.decision) }
            : item,
        ),
      };

    case EVENT_TYPES.QUOTE_ANALYZED:
      return {
        ...state,
        vehicleId: event.payload.vehicleId,
        quoteAnalyses: [
          ...state.quoteAnalyses,
          {
            quoteId: event.payload.quoteId,
            shop: event.payload.shop,
            summary: event.payload.summary,
            totalQuoted: event.payload.totalQuoted,
            totalFairHigh: event.payload.totalFairHigh,
            analyzedAt: event.payload.analyzedAt,
            lines: event.payload.lines,
          },
        ].slice(-5),
      };

    case EVENT_TYPES.KNOWLEDGE_SCHEDULE_RECORDED:
      return {
        ...state,
        vehicleId: event.payload.vehicleId,
        knowledgeSchedule: [
          ...state.knowledgeSchedule,
          ...event.payload.entries.map((entry) => ({
            entryId: entry.entryId,
            serviceName: entry.serviceName,
            intervalMiles: entry.intervalMiles,
            intervalMonths: entry.intervalMonths,
            sourceDocumentId: entry.sourceDocumentId,
            sourcePage: entry.sourcePage,
            manualTitle: event.payload.manualTitle,
            recordedAt: event.payload.recordedAt,
          })),
        ],
      };

    default:
      return state;
  }
};

export const foldEvents = (
  vehicleId: string,
  events: CatalogDomainEvent[],
): VehicleProjectionState =>
  events.reduce(applyEvent, createEmptyVehicleState(vehicleId));
