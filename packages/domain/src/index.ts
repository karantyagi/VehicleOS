export type { AggregateType, AppendDomainEventInput, DomainEventEnvelope } from "./events/types.js";
export {
  EVENT_TYPES,
  EVENT_VERSIONS,
  GOLDEN_PATH_FLOW,
  type CatalogDomainEvent,
  type DocumentExtractionCompletedPayload,
  type DocumentIngestedPayload,
  type DomainEventPayloadMap,
  type DomainEventType,
  type ExtractedServiceFields,
  type IngestChannel,
  type MaintenanceRecommendationCreatedPayload,
  type ServiceRecordedPayload,
  type TaskCreatedPayload,
  type TaskDecidedPayload,
  type TaskDecision,
  type TaskStatus,
} from "./events/catalog.js";

export type {
  EvidenceVaultEntry,
  NowQueueItem,
  QuoteAnalysisEntry,
  ServiceTimelineEntry,
  VehicleProjectionState,
} from "./projections/types.js";
export { applyEvent, createEmptyVehicleState, foldEvents } from "./projections/apply.js";

export type { MaintenanceRecommendation, PolicyEvaluationInput } from "./policy/types.js";
export type { PolicyEngine } from "./policy/policy-engine.js";
export { StubPolicyEngine } from "./policy/stub-policy-engine.js";

export type { EventStore } from "./ports/event-store.js";
export type { IngestAdapter, IngestCapture } from "./ports/ingest-adapter.js";
export type { JobPublisher, WorkerJobType } from "./ports/job-publisher.js";

export { InMemoryEventStore } from "./adapters/in-memory-event-store.js";
export { ReceiptUploadAdapter } from "./adapters/receipt-upload-adapter.js";

export {
  decideTask,
  confirmServiceWithConflictCheck,
  recordServiceAndRecommend,
  type GoldenPathResult,
  type RecordServiceInput,
  type ServiceConfirmResult,
} from "./golden-path/service-loop.js";
export { detectServiceConflict, type ServiceConflict } from "./conflicts/detect-service-conflict.js";
export {
  analyzeDealerQuote,
  parseQuoteText,
  type QuoteAnalysisResult,
  type QuoteLineAnalysis,
  type QuoteLineVerdict,
} from "./quotes/analyze-dealer-quote.js";
export { recordQuoteAnalysis } from "./quotes/record-quote-analysis.js";
export {
  buildResaleReport,
  type BuildResaleReportInput,
  type ResaleReportVehicle,
  type VehicleOSResaleReportV1,
} from "./export/build-resale-report.js";
export { formatResaleReportMarkdown } from "./export/format-resale-report-markdown.js";
