export const RESEARCH_COHORT_SURFACE = "research-cohort";
export const RESEARCH_IMPORT_SOURCE = "carfax-pdf";
export const RESEARCH_IMPORT_BUCKET = "research-imports";
export const RESEARCH_SCHEMA_VERSION = "carfax-service-history.v1";
export const RESEARCH_PROMPT_VERSION = "research-carfax-contract.v1";
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

export type ResearchServiceRecord = {
  serviceDate: string | null;
  mileage: number | null;
  provider: string | null;
  lineItems: string[];
  confidence: number;
  evidence: string;
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
  adjudicationStatus: ResearchAdjudicationStatus;
  observedAt: string;
};

export type ResearchStrategySummary = {
  attempted: number;
  extracted: number;
  extractionRate: number;
  averageCorrectionChanges: number | null;
  averageServiceLinePrecision: number | null;
  averageServiceLineRecall: number | null;
  unsupportedServiceLines: number;
  omittedServiceLines: number;
  medianLatencyMs: number | null;
  averageTotalTokens: number | null;
  averageEstimatedCostUsd: number | null;
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
  draft?: ResearchImportDraft | null;
  errorCode?: string | null;
};
