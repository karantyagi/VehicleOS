import { EVENT_TYPES, type CatalogDomainEvent } from "../events/catalog.js";
import {
  createEmptyVehicleState,
  type NowQueueItem,
  type ServiceTimelineEntry,
  type VehicleProjectionState,
} from "./types.js";

export { createEmptyVehicleState };

const taskStatusFromDecision = (
  decision: "schedule" | "complete" | "approve" | "dismiss" | "snooze",
): NowQueueItem["status"] => {
  if (decision === "schedule") return "scheduled";
  if (decision === "complete") return "completed";
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
        shopLocation: event.payload.shopLocation,
        serviceDate: event.payload.serviceDate,
        mileage: event.payload.mileage,
        lineItems: event.payload.lineItems,
        total: event.payload.total,
        evidenceIds: event.payload.evidenceIds,
        source: event.payload.source,
      };

      return {
        ...state,
        vehicleId: event.payload.vehicleId,
        currentMileage: Math.max(state.currentMileage, event.payload.mileage),
        timeline: [...state.timeline, entry],
      };
    }

    case EVENT_TYPES.SERVICE_UPDATED: {
      const { serviceId, ...patch } = event.payload;
      const nextTimeline = state.timeline.map((entry) => {
        if (entry.serviceId !== serviceId) return entry;
        return {
          ...entry,
          ...(patch.shop !== undefined ? { shop: patch.shop } : {}),
          ...(patch.shopLocation !== undefined
            ? { shopLocation: patch.shopLocation ?? undefined }
            : {}),
          ...(patch.serviceDate !== undefined ? { serviceDate: patch.serviceDate } : {}),
          ...(patch.mileage !== undefined ? { mileage: patch.mileage } : {}),
          ...(patch.lineItems !== undefined ? { lineItems: patch.lineItems } : {}),
          ...(patch.total !== undefined ? { total: patch.total } : {}),
        };
      });

      const updatedEntry = nextTimeline.find((entry) => entry.serviceId === serviceId);
      const nextMileage =
        typeof updatedEntry?.mileage === "number"
          ? Math.max(state.currentMileage, updatedEntry.mileage)
          : state.currentMileage;

      return {
        ...state,
        vehicleId: event.payload.vehicleId,
        currentMileage: nextMileage,
        timeline: nextTimeline,
      };
    }

    case EVENT_TYPES.SERVICE_MERGED:
      return {
        ...state,
        vehicleId: event.payload.vehicleId,
        timeline: state.timeline
          .filter((entry) => entry.serviceId !== event.payload.mergedServiceId)
          .map((entry) =>
            entry.serviceId === event.payload.targetServiceId
              ? {
                  ...entry,
                  lineItems: event.payload.lineItems,
                  evidenceIds: event.payload.evidenceIds,
                  total: event.payload.total,
                }
              : entry,
          ),
      };

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
        dueBy: event.payload.dueBy ?? null,
        suggestedReasonId: event.payload.suggestedReasonId,
        draftReasonSource: event.payload.draftReasonSource,
        suggestedIntervalMiles: event.payload.suggestedIntervalMiles,
        suggestedIntervalMonths: event.payload.suggestedIntervalMonths,
        intervalKind: event.payload.intervalKind,
        snoozeCount: 0,
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
        nowQueue: state.nowQueue.map((item) => {
          if (item.taskId !== event.payload.taskId) return item;

          if (event.payload.decision === "snooze") {
            return {
              ...item,
              status: taskStatusFromDecision(event.payload.decision),
              snoozeUntil: event.payload.snoozeUntil ?? null,
              snoozeCount: (item.snoozeCount ?? 0) + 1,
            };
          }

          return {
            ...item,
            status: taskStatusFromDecision(event.payload.decision),
          };
        }),
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
            canonicalServiceId: entry.canonicalServiceId,
            manualTitle: event.payload.manualTitle,
            recordedAt: event.payload.recordedAt,
          })),
        ],
      };

    case EVENT_TYPES.VEHICLE_RECORD_RECORDED:
      return {
        ...state,
        vehicleId: event.payload.vehicleId,
        currentMileage:
          typeof event.payload.mileage === "number"
            ? Math.max(state.currentMileage, event.payload.mileage)
            : state.currentMileage,
        ownershipRecords: [
          ...state.ownershipRecords,
          {
            recordId: event.payload.recordId,
            agency: event.payload.agency,
            recordDate: event.payload.recordDate,
            mileage: event.payload.mileage,
            eventType: event.payload.eventType,
            description: event.payload.description,
            details: event.payload.details,
            source: event.payload.source,
          },
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
