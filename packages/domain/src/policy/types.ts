import type { VehicleProjectionState } from "../projections/types.js";

export type MaintenanceRecommendation = {
  recommendationId: string;
  title: string;
  reason: string;
  confidence: number;
  evidenceIds: string[];
  ruleId: string;
};

export type PolicyEvaluationInput = {
  vehicleId: string;
  state: VehicleProjectionState;
};
