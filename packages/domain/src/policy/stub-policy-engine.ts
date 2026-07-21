import type { PolicyEngine } from "./policy-engine.js";
import type { MaintenanceRecommendation, PolicyEvaluationInput } from "./types.js";
import { evaluateKnowledgeDue } from "../knowledge/evaluate-knowledge-due.js";

const OIL_CHANGE_INTERVAL_MILES = 5_000;
const CABIN_FILTER_INTERVAL_MILES = 15_000;

const hasLineItemMatch = (lineItems: string[], pattern: RegExp): boolean =>
  lineItems.some((item) => pattern.test(item.toLowerCase()));

export class StubPolicyEngine implements PolicyEngine {
  evaluate(input: PolicyEvaluationInput): MaintenanceRecommendation | null {
    const { state } = input;

    if (state.timeline.length === 0) {
      const knowledgeDue = evaluateKnowledgeDue(state);
      if (knowledgeDue) return knowledgeDue;

      return {
        recommendationId: crypto.randomUUID(),
        title: "Log your first service",
        reason: "No maintenance history yet. Upload a receipt or add a service record to start recommendations.",
        confidence: 1,
        evidenceIds: [],
        ruleId: "schedule.policy.onboarding.v1",
      };
    }

    const knowledgeDue = evaluateKnowledgeDue(state);
    if (knowledgeDue) return knowledgeDue;

    const latestService = state.timeline[state.timeline.length - 1];
    const milesSinceLastService = Math.max(0, state.currentMileage - latestService.mileage);

    const lastOilChange = [...state.timeline]
      .reverse()
      .find((entry) => hasLineItemMatch(entry.lineItems, /oil change|oil & filter|synthetic oil/));

    const oilBaselineMileage = lastOilChange?.mileage ?? latestService.mileage;
    const milesSinceOilChange = Math.max(0, state.currentMileage - oilBaselineMileage);

    if (milesSinceOilChange >= OIL_CHANGE_INTERVAL_MILES) {
      return {
        recommendationId: crypto.randomUUID(),
        title: "Oil change due",
        reason: `${milesSinceOilChange.toLocaleString()} miles since last oil change. Interval target is ${OIL_CHANGE_INTERVAL_MILES.toLocaleString()} miles.`,
        confidence: 0.95,
        evidenceIds: lastOilChange?.evidenceIds ?? latestService.evidenceIds,
        ruleId: "schedule.policy.oil_change.v1",
      };
    }

    const lastCabinFilter = [...state.timeline]
      .reverse()
      .find((entry) => hasLineItemMatch(entry.lineItems, /cabin filter|cabin air filter/));

    const cabinBaselineMileage = lastCabinFilter?.mileage ?? 0;
    const milesSinceCabinFilter = Math.max(0, state.currentMileage - cabinBaselineMileage);

    if (milesSinceCabinFilter >= CABIN_FILTER_INTERVAL_MILES) {
      return {
        recommendationId: crypto.randomUUID(),
        title: "Cabin air filter",
        reason: `${milesSinceCabinFilter.toLocaleString()} miles since last cabin filter service. Interval target is ${CABIN_FILTER_INTERVAL_MILES.toLocaleString()} miles.`,
        confidence: 0.9,
        evidenceIds: lastCabinFilter?.evidenceIds ?? latestService.evidenceIds,
        ruleId: "schedule.policy.cabin_filter.v1",
      };
    }

    if (milesSinceLastService >= 3_000) {
      return {
        recommendationId: crypto.randomUUID(),
        title: "Tire rotation",
        reason: `${milesSinceLastService.toLocaleString()} miles since last logged service. Rotate tires to even tread wear.`,
        confidence: 0.85,
        evidenceIds: latestService.evidenceIds,
        ruleId: "schedule.policy.tire_rotation.v1",
      };
    }

    return null;
  }
}
