import { describe, expect, it } from "vitest";
import { buildResearchOperatorReport, canSkipSourceAdjudication, compareDraftToOwnerCorrection } from "./comparison.js";
import type { ResearchComparisonObservation, ResearchExtractionAttempt, ResearchImportDraft } from "./types.js";

const proposed: ResearchImportDraft = {
  documentType: "carfax-service-history",
  vehicleVin: "VIN",
  records: [{
    serviceDate: "2025-01-01",
    mileage: 10000,
    provider: "Example Auto",
    lineItems: ["Oil changed", "Invented service"],
    confidence: 0.9,
    evidence: "source",
  }],
  warnings: [],
};

const corrected: ResearchImportDraft = {
  ...proposed,
  records: [{ ...proposed.records[0], lineItems: ["Oil changed", "Tires rotated"] }],
};

describe("research comparison metrics", () => {
  it("counts owner-rejected and omitted service lines without fuzzy scoring", () => {
    expect(compareDraftToOwnerCorrection(proposed, corrected)).toMatchObject({
      correctionChanges: 2,
      unsupportedServiceLines: 1,
      omittedServiceLines: 1,
      serviceLinePrecision: 0.5,
      serviceLineRecall: 0.5,
    });
  });

  it("does not treat service details the report never itemized as a model rejection", () => {
    const sourceUnclear: ResearchImportDraft = {
      ...proposed,
      records: [{
        ...proposed.records[0],
        lineItems: [],
        review: {
          visitOutcome: "confirmed",
          serviceItems: [{ originalItem: "Invented service", finalItem: null, outcome: "not-itemized" }],
        },
      }],
    };

    expect(compareDraftToOwnerCorrection(proposed, sourceUnclear)).toMatchObject({
      unsupportedServiceLines: 0,
      omittedServiceLines: 0,
      unverifiableServiceRecords: 1,
    });
  });

  it("does not recommend a strategy before the evidence floor", () => {
    const observation: ResearchComparisonObservation = {
      id: "observation-1",
      runId: "run-1",
      displayedStrategy: "text-first",
      baselineStatus: "extracted",
      challengerStatus: "extracted",
      baselineMetrics: compareDraftToOwnerCorrection(proposed, corrected),
      challengerMetrics: compareDraftToOwnerCorrection(corrected, corrected),
      baselineLatencyMs: 100,
      challengerLatencyMs: 200,
      baselineTotalTokens: 1000,
      challengerTotalTokens: 2000,
      baselineEstimatedCostUsd: 0.01,
      challengerEstimatedCostUsd: 0.02,
      baselineSchemaValid: true,
      challengerSchemaValid: true,
      baselineUsableDraft: true,
      challengerUsableDraft: true,
      adjudicationStatus: "pending",
      observedAt: "2026-08-02T00:00:00.000Z",
    };
    const report = buildResearchOperatorReport({ runs: [], observations: [observation], minimumReviewedRuns: 5 });
    expect(report.decisionState).toBe("collecting-evidence");
    expect(report.reviewedPairedRuns).toBe(0);
    expect(report.excludedFromDecision).toBe(1);
    expect(report.pendingAdjudications).toBe(0);
  });

  it("requires source review when both strategies agree but the owner corrects their shared omission", () => {
    const sharedDraft: ResearchImportDraft = {
      ...proposed,
      records: [{ ...proposed.records[0], lineItems: ["Oil changed"] }],
    };
    const ownerDraft: ResearchImportDraft = {
      ...sharedDraft,
      records: [{ ...sharedDraft.records[0], lineItems: ["Oil changed", "Tires rotated"] }],
    };
    const metrics = compareDraftToOwnerCorrection(sharedDraft, ownerDraft);
    const attempt: ResearchExtractionAttempt = {
      strategy: "text-first",
      status: "extracted",
      model: "gpt-5-mini-2025-08-07",
      promptVersion: "carfax-import.v2",
      schemaVersion: "carfax-import.v1",
      inputCharacterCount: 10,
      inputTokens: 1,
      outputTokens: 1,
      totalTokens: 2,
      latencyMs: 1,
      estimatedCostUsd: 0.001,
      providerRequestId: "request",
      schemaValid: true,
      usableDraft: true,
      errorCode: null,
      draft: sharedDraft,
    };

    expect(canSkipSourceAdjudication({
      baseline: attempt,
      challenger: { ...attempt, strategy: "direct-pdf" },
      baselineMetrics: metrics,
      challengerMetrics: metrics,
    })).toBe(false);
  });

  it("reports explicit quality rates and tail latency from paired observations", () => {
    const observations: ResearchComparisonObservation[] = Array.from({ length: 20 }, (_, index) => ({
      id: `observation-${index}`,
      runId: `run-${index}`,
      displayedStrategy: "text-first",
      baselineStatus: index === 19 ? "extract-failed" : "extracted",
      challengerStatus: "extracted",
      baselineMetrics: null,
      challengerMetrics: null,
      baselineLatencyMs: (index + 1) * 100,
      challengerLatencyMs: (index + 1) * 200,
      baselineTotalTokens: index + 1,
      challengerTotalTokens: (index + 1) * 2,
      baselineEstimatedCostUsd: (index + 1) / 10_000,
      challengerEstimatedCostUsd: (index + 1) / 5_000,
      baselineSchemaValid: index === 18 ? false : true,
      challengerSchemaValid: null,
      baselineUsableDraft: index !== 19,
      challengerUsableDraft: true,
      adjudicationStatus: "pending",
      observedAt: "2026-08-03T00:00:00.000Z",
    }));

    const report = buildResearchOperatorReport({ runs: [], observations });
    expect(report.baseline).toMatchObject({
      attempted: 20,
      usableDrafts: 19,
      usableDraftRate: 0.95,
      schemaValidResponses: 19,
      schemaValidityObserved: 20,
      schemaValidRate: 0.95,
      failedAttempts: 1,
      failureRate: 0.05,
      p50LatencyMs: 1050,
      p95LatencyMs: 1900,
      p95EstimatedCostUsd: 0.0019,
    });
    expect(report.challenger).toMatchObject({
      schemaValidityObserved: 0,
      schemaValidRate: null,
      p50LatencyMs: 2100,
      p95LatencyMs: 3800,
    });
  });
});
