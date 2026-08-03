import { describe, expect, it } from "vitest";
import { assignResearchStrategy, selectDisplayedAttempt } from "./experiment.js";
import type { ResearchAttemptStoreInput, ResearchImportDraft } from "./types.js";

const draft: ResearchImportDraft = {
  documentType: "carfax-service-history",
  vehicleVin: null,
  records: [],
  warnings: [],
};

const attempt = (
  strategy: "text-first" | "direct-pdf",
  status: ResearchAttemptStoreInput["status"],
): ResearchAttemptStoreInput => ({
  runId: "run-1",
  strategy,
  status,
  model: "gpt-5-mini",
  draft: status === "extracted" ? draft : null,
});

describe("paired research experiment", () => {
  it("assigns a stable, balanced arm before outcomes exist", () => {
    expect(assignResearchStrategy("00000000-0000-0000-0000-000000000000")).toBe("text-first");
    expect(assignResearchStrategy("00000000-0000-0000-0000-000000000001")).toBe("direct-pdf");
    expect(assignResearchStrategy("00000000-0000-0000-0000-000000000001")).toBe("direct-pdf");
  });

  it("shows the assigned valid draft without merging attempts", () => {
    const result = selectDisplayedAttempt({
      assignedStrategy: "text-first",
      attempts: [attempt("text-first", "extracted"), attempt("direct-pdf", "extracted")],
    });
    expect(result.displayedStrategy).toBe("text-first");
    expect(result.overrideReason).toBeNull();
    expect(result.draft).toBe(draft);
  });

  it("records a fallback only when the assigned attempt is invalid", () => {
    const result = selectDisplayedAttempt({
      assignedStrategy: "text-first",
      attempts: [attempt("text-first", "text-unavailable"), attempt("direct-pdf", "extracted")],
    });
    expect(result).toMatchObject({
      status: "extracted",
      displayedStrategy: "direct-pdf",
      overrideReason: "assigned-attempt-unavailable",
    });
  });

  it("returns an explicit failure when neither attempt is valid", () => {
    const result = selectDisplayedAttempt({
      assignedStrategy: "direct-pdf",
      attempts: [attempt("text-first", "extract-failed"), attempt("direct-pdf", "extract-failed")],
    });
    expect(result.status).toBe("extract-failed");
    expect(result.displayedStrategy).toBeNull();
    expect(result.draft).toBeNull();
  });
});
