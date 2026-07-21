import type { IngestChannel, ServiceRecordSource, TaskStatus } from "../events/catalog.js";

export type ServiceTimelineEntry = {
  serviceId: string;
  shop: string;
  serviceDate: string;
  mileage: number;
  lineItems: string[];
  total: string;
  evidenceIds: string[];
  source?: ServiceRecordSource;
};

export type NowQueueItem = {
  taskId: string;
  recommendationId: string;
  title: string;
  reason: string;
  status: TaskStatus;
  ruleId?: string;
  taskKind?: "recommendation" | "verification";
  verificationCode?: "VERIFY_ODOMETER" | "VERIFY_DATE";
};

export type EvidenceVaultEntry = {
  documentId: string;
  storageKey: string;
  channel: IngestChannel;
  ingestedAt: string;
  immutable: true;
};

export type QuoteAnalysisEntry = {
  quoteId: string;
  shop?: string;
  summary: string;
  totalQuoted: number;
  totalFairHigh: number;
  analyzedAt: string;
  lines: {
    description: string;
    quotedAmount: number;
    fairMin: number;
    fairMax: number;
    verdict: "fair" | "high" | "optional" | "necessary" | "unknown";
    reason: string;
  }[];
};

export type KnowledgeScheduleEntry = {
  entryId: string;
  serviceName: string;
  intervalMiles?: number;
  intervalMonths?: number;
  sourceDocumentId: string;
  sourcePage?: string;
  manualTitle: string;
  recordedAt: string;
};

export type VehicleProjectionState = {
  vehicleId: string;
  currentMileage: number;
  timeline: ServiceTimelineEntry[];
  nowQueue: NowQueueItem[];
  quoteAnalyses: QuoteAnalysisEntry[];
  evidenceVault: EvidenceVaultEntry[];
  knowledgeSchedule: KnowledgeScheduleEntry[];
};

export const createEmptyVehicleState = (vehicleId: string): VehicleProjectionState => ({
  vehicleId,
  currentMileage: 0,
  timeline: [],
  nowQueue: [],
  quoteAnalyses: [],
  evidenceVault: [],
  knowledgeSchedule: [],
});
