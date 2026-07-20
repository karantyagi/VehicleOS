import type { MaintenanceRecommendation, PolicyEvaluationInput } from "./types.js";

export interface PolicyEngine {
  evaluate(input: PolicyEvaluationInput): MaintenanceRecommendation | null;
}
