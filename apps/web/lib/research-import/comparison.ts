import type {
  ResearchAttemptMetrics,
  ResearchComparisonObservation,
  ResearchExtractionAttempt,
  ResearchImportDraft,
  ResearchOperatorReport,
  ResearchOperatorRun,
  ResearchStrategySummary,
} from "./types";

const normalize = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, " ");

const multisetDifference = (left: string[], right: string[]): number => {
  const remaining = right.map(normalize);
  let difference = 0;
  for (const value of left.map(normalize)) {
    const index = remaining.indexOf(value);
    if (index >= 0) remaining.splice(index, 1);
    else difference += 1;
  }
  return difference;
};

const lineItems = (draft: ResearchImportDraft): string[] => draft.records.flatMap((record) => record.lineItems);

const ratio = (numerator: number, denominator: number): number =>
  denominator === 0 ? (numerator === 0 ? 1 : 0) : numerator / denominator;

export const compareDraftToOwnerCorrection = (
  proposed: ResearchImportDraft,
  corrected: ResearchImportDraft,
): ResearchAttemptMetrics => {
  const proposedLines = lineItems(proposed);
  const correctedLines = lineItems(corrected);
  const unsupportedServiceLines = multisetDifference(proposedLines, correctedLines);
  const omittedServiceLines = multisetDifference(correctedLines, proposedLines);
  const sharedLineCount = Math.max(0, proposedLines.length - unsupportedServiceLines);
  const comparableVisitCount = Math.min(proposed.records.length, corrected.records.length);
  let exactDateMatches = 0;
  let exactMileageMatches = 0;
  let exactProviderMatches = 0;
  let fieldChanges = proposed.vehicleVin === corrected.vehicleVin ? 0 : 1;

  // CARFAX prints service visits chronologically, so positional comparison is
  // intentionally transparent here. Tuned record matching belongs in the
  // private engine, not this public research contract.
  for (let index = 0; index < comparableVisitCount; index += 1) {
    const left = proposed.records[index];
    const right = corrected.records[index];
    if (left.serviceDate === right.serviceDate) exactDateMatches += 1;
    else fieldChanges += 1;
    if (left.mileage === right.mileage) exactMileageMatches += 1;
    else fieldChanges += 1;
    if (normalize(left.provider ?? "") === normalize(right.provider ?? "")) exactProviderMatches += 1;
    else fieldChanges += 1;
  }

  const visitCountChanges = Math.abs(proposed.records.length - corrected.records.length);
  return {
    correctionChanges: fieldChanges + visitCountChanges + unsupportedServiceLines + omittedServiceLines,
    proposedVisits: proposed.records.length,
    correctedVisits: corrected.records.length,
    omittedServiceLines,
    unsupportedServiceLines,
    serviceLinePrecision: ratio(sharedLineCount, proposedLines.length),
    serviceLineRecall: ratio(sharedLineCount, correctedLines.length),
    exactDateMatches,
    exactMileageMatches,
    exactProviderMatches,
  };
};

export const canSkipSourceAdjudication = (input: {
  baseline: ResearchExtractionAttempt;
  challenger: ResearchExtractionAttempt;
  baselineMetrics: ResearchAttemptMetrics | null;
  challengerMetrics: ResearchAttemptMetrics | null;
}): boolean => {
  if (!input.baseline.draft || !input.challenger.draft) return false;
  if (JSON.stringify(input.baseline.draft) !== JSON.stringify(input.challenger.draft)) return false;
  return input.baselineMetrics?.correctionChanges === 0 && input.challengerMetrics?.correctionChanges === 0;
};

const average = (values: Array<number | null>): number | null => {
  const present = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : null;
};

const median = (values: Array<number | null>): number | null => {
  const present = values
    .filter((value): value is number => value !== null && Number.isFinite(value))
    .sort((left, right) => left - right);
  if (!present.length) return null;
  const middle = Math.floor(present.length / 2);
  return present.length % 2 ? present[middle] : (present[middle - 1] + present[middle]) / 2;
};

const summarizeStrategy = (
  observations: ResearchComparisonObservation[],
  qualityObservations: ResearchComparisonObservation[],
  strategy: "baseline" | "challenger",
): ResearchStrategySummary => {
  const statusKey = strategy === "baseline" ? "baselineStatus" : "challengerStatus";
  const metricsKey = strategy === "baseline" ? "baselineMetrics" : "challengerMetrics";
  const latencyKey = strategy === "baseline" ? "baselineLatencyMs" : "challengerLatencyMs";
  const tokensKey = strategy === "baseline" ? "baselineTotalTokens" : "challengerTotalTokens";
  const costKey = strategy === "baseline" ? "baselineEstimatedCostUsd" : "challengerEstimatedCostUsd";
  const metrics = qualityObservations.map((observation) => observation[metricsKey]).filter(Boolean) as ResearchAttemptMetrics[];
  const extracted = observations.filter((observation) => observation[statusKey] === "extracted").length;

  return {
    attempted: observations.length,
    extracted,
    extractionRate: ratio(extracted, observations.length),
    averageCorrectionChanges: average(metrics.map((value) => value.correctionChanges)),
    averageServiceLinePrecision: average(metrics.map((value) => value.serviceLinePrecision)),
    averageServiceLineRecall: average(metrics.map((value) => value.serviceLineRecall)),
    unsupportedServiceLines: metrics.reduce((sum, value) => sum + value.unsupportedServiceLines, 0),
    omittedServiceLines: metrics.reduce((sum, value) => sum + value.omittedServiceLines, 0),
    medianLatencyMs: median(observations.map((observation) => observation[latencyKey])),
    averageTotalTokens: average(observations.map((observation) => observation[tokensKey])),
    averageEstimatedCostUsd: average(observations.map((observation) => observation[costKey])),
  };
};

export const buildResearchOperatorReport = (input: {
  runs: ResearchOperatorRun[];
  observations: ResearchComparisonObservation[];
  minimumReviewedRuns?: number;
}): ResearchOperatorReport => {
  const minimumReviewedRuns = input.minimumReviewedRuns ?? 25;
  const decisionObservations = input.observations.filter(
    (observation) => observation.adjudicationStatus === "confirmed" || observation.adjudicationStatus === "not-required",
  );
  const baseline = summarizeStrategy(input.observations, decisionObservations, "baseline");
  const challenger = summarizeStrategy(input.observations, decisionObservations, "challenger");
  let decisionState: ResearchOperatorReport["decisionState"] = "collecting-evidence";
  let decisionReason = `Collect ${Math.max(0, minimumReviewedRuns - decisionObservations.length)} more source-verified paired reviews before choosing a default.`;

  if (decisionObservations.length >= minimumReviewedRuns) {
    const baselineCorrections = baseline.averageCorrectionChanges ?? Number.POSITIVE_INFINITY;
    const challengerCorrections = challenger.averageCorrectionChanges ?? Number.POSITIVE_INFINITY;
    const challengerHasSafetyRegression = challenger.unsupportedServiceLines > baseline.unsupportedServiceLines;
    const challengerQualityImproves =
      challengerCorrections < baselineCorrections &&
      (challenger.averageServiceLineRecall ?? 0) >= (baseline.averageServiceLineRecall ?? 0);

    if (challengerHasSafetyRegression) {
      decisionState = "keep-text-first";
      decisionReason = "Keep text-first: the challenger produced more owner-rejected service lines.";
    } else if (challengerQualityImproves) {
      decisionState = "review-challenger-for-promotion";
      decisionReason = "The challenger reduced correction effort without lowering recall; manually adjudicate promotion cases before changing the default.";
    } else if (challenger.extractionRate > baseline.extractionRate) {
      decisionState = "consider-direct-pdf-fallback";
      decisionReason = "Direct PDF recovered more documents but did not clearly improve normal-case quality; evaluate it as a fallback.";
    } else {
      decisionState = "inconclusive";
      decisionReason = "Neither strategy has a clear quality and safety advantage; keep the current default while reviewing segments.";
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    activeRuns: input.runs.length,
    pendingOwnerReviews: input.runs.filter((run) => run.status !== "reviewed").length,
    pendingAdjudications: input.runs.filter((run) => run.adjudicationStatus === "pending").length,
    reviewedPairedRuns: decisionObservations.length,
    excludedFromDecision: input.observations.length - decisionObservations.length,
    minimumReviewedRuns,
    baseline,
    challenger,
    decisionState,
    decisionReason,
  };
};

export const attemptMetrics = (
  attempt: ResearchExtractionAttempt | undefined,
  ownerDraft: ResearchImportDraft,
): ResearchAttemptMetrics | null => (attempt?.draft ? compareDraftToOwnerCorrection(attempt.draft, ownerDraft) : null);
