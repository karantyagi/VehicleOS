import type { PolicyEngine } from "./policy-engine.js";
import type { MaintenanceRecommendation, PolicyEvaluationInput } from "./types.js";
import { evaluateNextDueRecommendationFromPolicyInput } from "../owner-care/evaluate-next-due-recommendation.js";

export class StubPolicyEngine implements PolicyEngine {
  evaluate(input: PolicyEvaluationInput): MaintenanceRecommendation | null {
    return evaluateNextDueRecommendationFromPolicyInput(input);
  }
}
