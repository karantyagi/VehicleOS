import { evaluateKnowledgeDue } from "../knowledge/evaluate-knowledge-due.js";
import type { MaintenanceRecommendation } from "../policy/types.js";
import type { PolicyEvaluationInput } from "../policy/types.js";
import type { VehicleProjectionState } from "../projections/types.js";
import {
  buildOwnerServiceScheduleBoard,
} from "../schedule/build-owner-service-schedule-board.js";
import {
  buildOwnerDueItems,
  isOwnerDueItemActionable,
} from "./build-owner-due-items.js";
import { dueItemToRecommendation } from "./due-item-to-recommendation.js";

const hasLineItemMatch = (lineItems: string[], pattern: RegExp): boolean =>
  lineItems.some((item) => pattern.test(item.toLowerCase()));

const evaluateStubMileageFallback = (
  state: VehicleProjectionState,
): MaintenanceRecommendation | null => {
  const latestService = state.timeline[state.timeline.length - 1];
  if (!latestService) return null;

  const milesSinceLastService = Math.max(0, state.currentMileage - latestService.mileage);

  const lastOilChange = [...state.timeline]
    .reverse()
    .find((entry) => hasLineItemMatch(entry.lineItems, /oil change|oil & filter|synthetic oil/));

  const oilBaselineMileage = lastOilChange?.mileage ?? latestService.mileage;
  const milesSinceOilChange = Math.max(0, state.currentMileage - oilBaselineMileage);

  if (milesSinceOilChange >= 5_000) {
    return {
      recommendationId: crypto.randomUUID(),
      title: "Oil change due",
      reason: `${milesSinceOilChange.toLocaleString()} miles since last oil change. Interval target is 5,000 miles.`,
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

  if (milesSinceCabinFilter >= 15_000) {
    return {
      recommendationId: crypto.randomUUID(),
      title: "Cabin air filter",
      reason: `${milesSinceCabinFilter.toLocaleString()} miles since last cabin filter service. Interval target is 15,000 miles.`,
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
};

export const evaluateNextDueRecommendation = (input: {
  state: VehicleProjectionState;
  today?: string;
}): MaintenanceRecommendation | null => {
  const { state } = input;
  const today = input.today ?? new Date().toISOString().slice(0, 10);

  const board = buildOwnerServiceScheduleBoard({
    knowledgeSchedule: state.knowledgeSchedule,
    timeline: state.timeline,
    currentMileage: state.currentMileage,
    today,
  });

  const dueView = buildOwnerDueItems({
    board,
    ownershipRecords: state.ownershipRecords,
    today,
  });

  const nextActionable = dueView.items.find(isOwnerDueItemActionable);
  if (nextActionable) return dueItemToRecommendation(nextActionable);

  if (state.timeline.length === 0) {
    const knowledgeDue = evaluateKnowledgeDue(state);
    if (knowledgeDue) return knowledgeDue;

    return {
      recommendationId: crypto.randomUUID(),
      title: "Log your first service",
      reason:
        "No maintenance history yet. Upload a receipt or add a service record to start recommendations.",
      confidence: 1,
      evidenceIds: [],
      ruleId: "schedule.policy.onboarding.v1",
    };
  }

  const knowledgeDue = evaluateKnowledgeDue(state);
  if (knowledgeDue) return knowledgeDue;

  return evaluateStubMileageFallback(state);
};

export const evaluateNextDueRecommendationFromPolicyInput = (
  input: PolicyEvaluationInput,
): MaintenanceRecommendation | null =>
  evaluateNextDueRecommendation({ state: input.state });
