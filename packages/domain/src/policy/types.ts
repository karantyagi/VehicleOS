import type { VehicleProjectionState } from "../projections/types.js";

export type MaintenanceRecommendation = {
  recommendationId: string;
  title: string;
  reason: string;
  confidence: number;
  evidenceIds: string[];
  ruleId: string;
  /** Explicit calendar deadline — used for RMV renewals and other non-OEM rows. */
  dueBy?: string | null;
};

export type PolicyEvaluationInput = {
  vehicleId: string;
  state: VehicleProjectionState;
};
