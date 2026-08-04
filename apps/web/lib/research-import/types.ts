export const RESEARCH_COHORT_SURFACE = "research-cohort";
export const RESEARCH_IMPORT_SOURCE = "carfax-pdf";
export const RESEARCH_IMPORT_BUCKET = "research-imports";
// v2 adds source-grounding fields that let the cohort distinguish a service
// record from a registration or inspection and show a location only when the
// document itself reported one.
export const RESEARCH_SCHEMA_VERSION = "carfax-service-history.v2";
// v4 retains the bounded v2 execution recipe (low-detail PDF images and
// minimal reasoning) and makes service-detail source limits explicit.
export const RESEARCH_PROMPT_VERSION = "research-carfax-contract.v4";
export const RESEARCH_CONSENT_VERSION = "research-cohort.v3";

export type ResearchExtractionStrategy = "text-first" | "direct-pdf";

export type ResearchAttemptStatus =
  | "text-unavailable"
  | "model-not-configured"
  | "extracted"
  | "extract-failed";

export type ResearchAdjudicationStatus = "pending" | "confirmed" | "corrected" | "not-required";

export type ResearchRunStatus =
  | "uploaded"
  | "processing"
  | "text-unavailable"
  | "model-not-configured"
  | "extracted"
  | "extract-failed"
  | "reviewed";

export type ResearchVisitReviewOutcome =
  | "unreviewed"
  | "confirmed"
  | "corrected"
  | "not-a-visit"
  | "unsure";

export type ResearchServiceItemReviewOutcome =
  | "unreviewed"
  | "confirmed"
  | "corrected"
  | "not-itemized"
  | "not-supported"
  | "unsure"
  | "added";

export type ResearchServiceItemReview = {
  originalItem: string | null;
  finalItem: string | null;
  outcome: ResearchServiceItemReviewOutcome;
};

export type ResearchRecordReview = {
  visitOutcome: ResearchVisitReviewOutcome;
  serviceItems: ResearchServiceItemReview[];
};

export type ResearchRecordKind = "service" | "inspection" | "registration" | "unknown";

export type ResearchReportedBy = "shop" | "government" | "owner" | "diy" | "unknown";

export type ResearchServiceDetailStatus = "itemized" | "not-itemized" | "not-applicable" | "unknown";

export type ResearchProviderLocation = {
  city: string | null;
  state: string | null;
  status: "reported" | "not-reported" | "ambiguous";
  source: "carfax-review-link" | "record-text" | null;
};

export type ResearchServiceRecord = {
  serviceDate: string | null;
  mileage: number | null;
  provider: string | null;
  lineItems: string[];
  confidence: number;
  evidence: string;
  // Evidence pages and the remaining fields are model proposal fields. The
  // import route applies deterministic validation/enrichment before storage.
  evidencePages: number[];
  recordKind: ResearchRecordKind;
  reportedBy: ResearchReportedBy;
  serviceDetailStatus: ResearchServiceDetailStatus;
  providerLocation: ResearchProviderLocation;
  // This is added only by the owner-review UI, never requested from the model.
  review?: ResearchRecordReview;
};

export type ResearchImportDraft = {
  documentType: "carfax-service-history" | "unknown";
  vehicleVin: string | null;
  records: ResearchServiceRecord[];
  warnings: string[];
};

export type ResearchImportRun = {
  id: string;
  source: typeof RESEARCH_IMPORT_SOURCE;
  status: ResearchRunStatus;
  fileName: string;
  createdAt: string;
  deleteAfter: string;
  textCharacterCount: number | null;
  model: string | null;
  promptVersion: string;
  draft: ResearchImportDraft | null;
  ownerDraft: ResearchImportDraft | null;
  errorCode: string | null;
};

export type ResearchExtractionAttempt = {
  strategy: ResearchExtractionStrategy;
  status: ResearchAttemptStatus;
  model: string | null;
  promptVersion: string;
  schemaVersion: string;
  inputCharacterCount: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  latencyMs: number | null;
  estimatedCostUsd: number | null;
  providerRequestId: string | null;
  // Null means the provider did not return a parseable structured response
  // (for example, timeout or HTTP failure). False means it did return one,
  // but it did not satisfy the public draft schema.
  schemaValid: boolean | null;
  // A usable draft is schema-valid CARFAX service history with at least one
  // service record. This is intentionally stricter than schema validity.
  usableDraft: boolean;
  draft: ResearchImportDraft | null;
  errorCode: string | null;
};

export type ResearchAttemptMetrics = {
  correctionChanges: number;
  proposedVisits: number;
  correctedVisits: number;
  omittedServiceLines: number;
  unsupportedServiceLines: number;
  serviceLinePrecision: number;
  serviceLineRecall: number;
  exactDateMatches: number;
  exactMileageMatches: number;
  exactProviderMatches: number;
  unverifiableServiceRecords: number;
};

export type ResearchOperatorRun = ResearchImportRun & {
  consentVersion: string;
  assignedStrategy: ResearchExtractionStrategy | null;
  displayedStrategy: ResearchExtractionStrategy | null;
  displayOverrideReason: string | null;
  attempts: ResearchExtractionAttempt[];
  adjudicationStatus: ResearchAdjudicationStatus;
  adjudicationNotes: string | null;
  adjudicatedAt: string | null;
};

export type ResearchComparisonObservation = {
  id: string;
  runId: string | null;
  displayedStrategy: ResearchExtractionStrategy | null;
  baselineStatus: ResearchAttemptStatus;
  challengerStatus: ResearchAttemptStatus;
  baselineMetrics: ResearchAttemptMetrics | null;
  challengerMetrics: ResearchAttemptMetrics | null;
  baselineLatencyMs: number | null;
  challengerLatencyMs: number | null;
  baselineTotalTokens: number | null;
  challengerTotalTokens: number | null;
  baselineEstimatedCostUsd: number | null;
  challengerEstimatedCostUsd: number | null;
  baselineSchemaValid: boolean | null;
  challengerSchemaValid: boolean | null;
  baselineUsableDraft: boolean;
  challengerUsableDraft: boolean;
  adjudicationStatus: ResearchAdjudicationStatus;
  observedAt: string;
};

export type ResearchStrategySummary = {
  attempted: number;
  extracted: number;
  extractionRate: number;
  schemaValidResponses: number;
  schemaValidityObserved: number;
  schemaValidRate: number | null;
  usableDrafts: number;
  usableDraftRate: number;
  failedAttempts: number;
  failureRate: number;
  averageCorrectionChanges: number | null;
  averageServiceLinePrecision: number | null;
  averageServiceLineRecall: number | null;
  unsupportedServiceLines: number;
  omittedServiceLines: number;
  unverifiableServiceRecords: number;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
  averageTotalTokens: number | null;
  averageEstimatedCostUsd: number | null;
  p50EstimatedCostUsd: number | null;
  p95EstimatedCostUsd: number | null;
};

export type ResearchDecisionState =
  | "collecting-evidence"
  | "review-challenger-for-promotion"
  | "keep-text-first"
  | "consider-direct-pdf-fallback"
  | "inconclusive";

export type ResearchOperatorReport = {
  generatedAt: string;
  activeRuns: number;
  pendingOwnerReviews: number;
  pendingAdjudications: number;
  reviewedPairedRuns: number;
  excludedFromDecision: number;
  minimumReviewedRuns: number;
  baseline: ResearchStrategySummary;
  challenger: ResearchStrategySummary;
  decisionState: ResearchDecisionState;
  decisionReason: string;
};

export type ResearchDeletionAuditEvent = {
  id: string;
  action: "delete-run" | "delete-participant" | "retention-cleanup";
  outcome: "succeeded" | "failed" | "partial";
  objectCount: number;
  errorClass: string | null;
  createdAt: string;
};

export type ResearchRunStoreInput = {
  id: string;
  userId: string;
  consentVersion: string;
  retainForEvals: boolean;
  fileName: string;
  fileBytes: number;
  contentSha256: string;
  storageKey: string;
  textCharacterCount: number | null;
  status: ResearchRunStatus;
  model: string | null;
  promptVersion?: string;
  draft?: ResearchImportDraft | null;
  ownerDraft?: ResearchImportDraft | null;
  errorCode?: string | null;
  deleteAfter: string;
  assignedStrategy: ResearchExtractionStrategy;
};

export type ResearchAttemptStoreInput = {
  runId: string;
  strategy: ResearchExtractionStrategy;
  status: ResearchAttemptStatus;
  model: string | null;
  promptVersion?: string;
  inputCharacterCount?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  latencyMs?: number | null;
  estimatedCostUsd?: number | null;
  providerRequestId?: string | null;
  schemaValid?: boolean | null;
  usableDraft?: boolean;
  draft?: ResearchImportDraft | null;
  errorCode?: string | null;
};
