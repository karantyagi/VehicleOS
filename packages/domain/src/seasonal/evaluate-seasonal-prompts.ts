import type { MaintenanceRecommendation } from "../policy/types.js";
import type { VehicleProjectionState } from "../projections/types.js";

export type ClimateZone = "cold" | "moderate" | "hot";

export type EvaluateSeasonalPromptsInput = {
  state: VehicleProjectionState;
  climateZone?: ClimateZone;
  referenceDate?: string;
};

type SeasonalRule = {
  ruleId: string;
  months: number[];
  climateZones: ClimateZone[];
  title: string;
  buildReason: (month: number) => string;
};

const SEASONAL_RULES: SeasonalRule[] = [
  {
    ruleId: "seasonal.policy.winter_prep.v1",
    months: [11, 12, 1, 2],
    climateZones: ["cold", "moderate"],
    title: "Winter prep check",
    buildReason: (month) =>
      `Cold-season month (${monthLabel(month)}) — check battery health, tire pressure, and washer fluid before sustained cold driving.`,
  },
  {
    ruleId: "seasonal.policy.tire_changeover.v1",
    months: [10, 11],
    climateZones: ["cold"],
    title: "Schedule winter tire changeover",
    buildReason: () =>
      "Cold-climate driving — swap to winter tires before sustained near-freezing temperatures.",
  },
  {
    ruleId: "seasonal.policy.spring_refresh.v1",
    months: [3, 4],
    climateZones: ["cold", "moderate", "hot"],
    title: "Spring service refresh",
    buildReason: () =>
      "Post-winter stretch — review fluids, wipers, and any items deferred during cold months.",
  },
  {
    ruleId: "seasonal.policy.summer_ac.v1",
    months: [5, 6, 7, 8],
    climateZones: ["hot", "moderate"],
    title: "Summer AC and cooling check",
    buildReason: () =>
      "Hot-season driving — confirm AC performance and coolant level before long trips.",
  },
];

const monthLabel = (month: number): string =>
  new Date(2000, month - 1, 1).toLocaleString("en-US", { month: "long" });

export const evaluateSeasonalPrompts = (
  input: EvaluateSeasonalPromptsInput,
): MaintenanceRecommendation[] => {
  const climateZone = input.climateZone ?? "moderate";
  const referenceDate = input.referenceDate ?? new Date().toISOString();
  const month = new Date(referenceDate).getUTCMonth() + 1;
  const lastTimelineEvidence = input.state.timeline.at(-1)?.evidenceIds;
  const lastVaultDocumentId = input.state.evidenceVault.at(-1)?.documentId;
  const latestEvidenceIds =
    lastTimelineEvidence && lastTimelineEvidence.length > 0
      ? lastTimelineEvidence
      : lastVaultDocumentId
        ? [lastVaultDocumentId]
        : [];

  return SEASONAL_RULES.filter(
    (rule) => rule.months.includes(month) && rule.climateZones.includes(climateZone),
  ).map((rule) => ({
    recommendationId: crypto.randomUUID(),
    title: rule.title,
    reason: rule.buildReason(month),
    confidence: 0.88,
    evidenceIds: latestEvidenceIds,
    ruleId: rule.ruleId,
  }));
};

export const seasonKeyForDate = (referenceDate: string): string => {
  const month = new Date(referenceDate).getUTCMonth() + 1;
  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "fall";
};

export const isSeasonalRuleId = (ruleId: string | undefined): boolean =>
  Boolean(ruleId?.startsWith("seasonal.policy."));
