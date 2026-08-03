import type {
  ResearchAttemptStoreInput,
  ResearchExtractionStrategy,
  ResearchImportDraft,
  ResearchRunStatus,
} from "./types";

export const assignResearchStrategy = (runId: string): ResearchExtractionStrategy => {
  const compact = runId.replaceAll("-", "");
  const bucket = Number.parseInt(compact.slice(-2), 16);
  return Number.isFinite(bucket) && bucket % 2 === 0 ? "text-first" : "direct-pdf";
};

const isValidAttempt = (
  attempt: ResearchAttemptStoreInput | undefined,
): attempt is ResearchAttemptStoreInput & { draft: ResearchImportDraft } =>
  attempt?.status === "extracted" && Boolean(attempt.draft);

export const selectDisplayedAttempt = (input: {
  assignedStrategy: ResearchExtractionStrategy;
  attempts: ResearchAttemptStoreInput[];
}): {
  displayedStrategy: ResearchExtractionStrategy | null;
  overrideReason: string | null;
  status: ResearchRunStatus;
  draft: ResearchImportDraft | null;
  model: string | null;
  errorCode: string | null;
} => {
  const assigned = input.attempts.find((attempt) => attempt.strategy === input.assignedStrategy);
  const fallbackStrategy: ResearchExtractionStrategy =
    input.assignedStrategy === "text-first" ? "direct-pdf" : "text-first";
  const fallback = input.attempts.find((attempt) => attempt.strategy === fallbackStrategy);

  if (isValidAttempt(assigned)) {
    return {
      displayedStrategy: assigned.strategy,
      overrideReason: null,
      status: "extracted",
      draft: assigned.draft,
      model: assigned.model,
      errorCode: null,
    };
  }

  if (isValidAttempt(fallback)) {
    return {
      displayedStrategy: fallback.strategy,
      overrideReason: "assigned-attempt-unavailable",
      status: "extracted",
      draft: fallback.draft,
      model: fallback.model,
      errorCode: null,
    };
  }

  const bothNotConfigured = input.attempts.every((attempt) => attempt.status === "model-not-configured");
  return {
    displayedStrategy: null,
    overrideReason: null,
    status: bothNotConfigured ? "model-not-configured" : "extract-failed",
    draft: null,
    model: assigned?.model ?? fallback?.model ?? null,
    errorCode: assigned?.errorCode ?? fallback?.errorCode ?? "paired-extraction-failed",
  };
};
