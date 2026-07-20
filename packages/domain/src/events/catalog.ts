import type { DomainEventEnvelope } from "./types.js";

export const EVENT_TYPES = {
  DOCUMENT_INGESTED: "document.ingested",
  DOCUMENT_EXTRACTION_COMPLETED: "document.extraction.completed",
  SERVICE_RECORDED: "service.recorded",
  MAINTENANCE_RECOMMENDATION_CREATED: "maintenance.recommendation.created",
  TASK_CREATED: "task.created",
  TASK_DECIDED: "task.decided",
} as const;

export type DomainEventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

export type IngestChannel = "receipt_upload" | "voice" | "photo" | "manual";

export type ExtractedServiceFields = {
  shop: string;
  serviceDate: string;
  mileage: number;
  lineItems: string[];
  total: string;
  confidence: number;
};

export type DocumentIngestedPayload = {
  vehicleId: string;
  documentId: string;
  channel: IngestChannel;
  storageKey: string;
};

export type DocumentExtractionCompletedPayload = {
  vehicleId: string;
  documentId: string;
  extracted: ExtractedServiceFields;
};

export type ServiceRecordedPayload = {
  vehicleId: string;
  serviceId: string;
  shop: string;
  serviceDate: string;
  mileage: number;
  lineItems: string[];
  total: string;
  evidenceIds: string[];
  documentId?: string;
};

export type MaintenanceRecommendationCreatedPayload = {
  vehicleId: string;
  recommendationId: string;
  title: string;
  reason: string;
  confidence: number;
  evidenceIds: string[];
  ruleId: string;
};

export type TaskStatus = "pending" | "approved" | "dismissed" | "snoozed";

export type TaskCreatedPayload = {
  vehicleId: string;
  taskId: string;
  recommendationId: string;
  title: string;
  reason: string;
  status: TaskStatus;
};

export type TaskDecision = "approve" | "dismiss" | "snooze";

export type TaskDecidedPayload = {
  vehicleId: string;
  taskId: string;
  decision: TaskDecision;
  decidedAt: string;
};

export type DomainEventPayloadMap = {
  [EVENT_TYPES.DOCUMENT_INGESTED]: DocumentIngestedPayload;
  [EVENT_TYPES.DOCUMENT_EXTRACTION_COMPLETED]: DocumentExtractionCompletedPayload;
  [EVENT_TYPES.SERVICE_RECORDED]: ServiceRecordedPayload;
  [EVENT_TYPES.MAINTENANCE_RECOMMENDATION_CREATED]: MaintenanceRecommendationCreatedPayload;
  [EVENT_TYPES.TASK_CREATED]: TaskCreatedPayload;
  [EVENT_TYPES.TASK_DECIDED]: TaskDecidedPayload;
};

export type CatalogDomainEvent = {
  [K in keyof DomainEventPayloadMap]: DomainEventEnvelope<K, DomainEventPayloadMap[K]>;
}[keyof DomainEventPayloadMap];

export const EVENT_VERSIONS: Record<DomainEventType, number> = {
  [EVENT_TYPES.DOCUMENT_INGESTED]: 1,
  [EVENT_TYPES.DOCUMENT_EXTRACTION_COMPLETED]: 1,
  [EVENT_TYPES.SERVICE_RECORDED]: 1,
  [EVENT_TYPES.MAINTENANCE_RECOMMENDATION_CREATED]: 1,
  [EVENT_TYPES.TASK_CREATED]: 1,
  [EVENT_TYPES.TASK_DECIDED]: 1,
};

export const GOLDEN_PATH_FLOW: DomainEventType[] = [
  EVENT_TYPES.DOCUMENT_INGESTED,
  EVENT_TYPES.DOCUMENT_EXTRACTION_COMPLETED,
  EVENT_TYPES.SERVICE_RECORDED,
  EVENT_TYPES.MAINTENANCE_RECOMMENDATION_CREATED,
  EVENT_TYPES.TASK_CREATED,
];
