import type { TaskStatus } from "../events/catalog.js";

export type ServiceTimelineEntry = {
  serviceId: string;
  shop: string;
  serviceDate: string;
  mileage: number;
  lineItems: string[];
  total: string;
  evidenceIds: string[];
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

export type VehicleProjectionState = {
  vehicleId: string;
  currentMileage: number;
  timeline: ServiceTimelineEntry[];
  nowQueue: NowQueueItem[];
  quoteAnalyses: QuoteAnalysisEntry[];
};

export const createEmptyVehicleState = (vehicleId: string): VehicleProjectionState => ({
  vehicleId,
  currentMileage: 0,
  timeline: [],
  nowQueue: [],
  quoteAnalyses: [],
});
