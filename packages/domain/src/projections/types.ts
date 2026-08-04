import type {
  IngestChannel,
  ServiceRecordSource,
  TaskStatus,
  VehicleRecordEventType,
  VehicleRecordSource,
} from "../events/catalog.js";
import type { ServiceRecordKind } from "../service/service-record-kind.js";
import type { CarfaxImportProvenance } from "../import/carfax-import-provenance.js";

export type ServiceTimelineEntry = {
  serviceId: string;
  shop: string;
  shopLocation?: string;
  serviceDate: string;
  mileage: number;
  lineItems: string[];
  total: string;
  evidenceIds: string[];
  source?: ServiceRecordSource;
  /** Present on new projections; legacy snapshots derive this from source and line items. */
  recordKind?: ServiceRecordKind;
  carfaxImport?: CarfaxImportProvenance;
};

export type NowQueueItem = {
  taskId: string;
  recommendationId: string;
  title: string;
  reason: string;
  status: TaskStatus;
  ruleId?: string;
  taskKind?: "recommendation" | "verification";
  verificationCode?:
    | "VERIFY_ODOMETER"
    | "VERIFY_DATE"
    | "VERIFY_VEHICLE_PROFILE"
    | "VERIFY_IMPORT_ROW"
    | "VERIFY_MAINTENANCE_TIMING"
    | "VERIFY_OWNER_INTERVAL";
  dueBy?: string | null;
  suggestedReasonId?: "winter_salt" | "noise_symptom" | "dealer_recommended" | "aggressive_driving" | "deferred_intentionally" | "other";
  draftReasonSource?: "heuristic" | "llm";
  suggestedIntervalMiles?: number;
  suggestedIntervalMonths?: number;
  intervalKind?: "general" | "tire_rotation";
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
  canonicalServiceId?: string;
};

export type OwnershipRecordEntry = {
  recordId: string;
  agency: string;
  recordDate: string;
  mileage: number | null;
  eventType: VehicleRecordEventType;
  description: string;
  details: string[];
  source: VehicleRecordSource;
};

export type VehicleProjectionState = {
  vehicleId: string;
  currentMileage: number;
  timeline: ServiceTimelineEntry[];
  nowQueue: NowQueueItem[];
  quoteAnalyses: QuoteAnalysisEntry[];
  evidenceVault: EvidenceVaultEntry[];
  knowledgeSchedule: KnowledgeScheduleEntry[];
  ownershipRecords: OwnershipRecordEntry[];
};

export const createEmptyVehicleState = (vehicleId: string): VehicleProjectionState => ({
  vehicleId,
  currentMileage: 0,
  timeline: [],
  nowQueue: [],
  quoteAnalyses: [],
  evidenceVault: [],
  knowledgeSchedule: [],
  ownershipRecords: [],
});
