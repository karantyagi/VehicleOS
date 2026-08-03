import { NextResponse } from "next/server";
import { getResearchOperatorAccess } from "../../../../../lib/research-import/access";
import { buildResearchOperatorReport } from "../../../../../lib/research-import/comparison";
import {
  listResearchComparisonObservations,
  listResearchDeletionAuditEvents,
  listResearchOperatorRuns,
  recordResearchOperatorAudit,
} from "../../../../../lib/research-import/repository";

export const dynamic = "force-dynamic";

const accessError = (reason: "not-research-surface" | "sign-in-required" | "not-invited") => {
  const status = reason === "sign-in-required" ? 401 : reason === "not-invited" ? 403 : 404;
  return NextResponse.json({ error: reason.replaceAll("-", "_") }, { status });
};

const minimumReviewedRuns = (): number => {
  const configured = Number.parseInt(process.env.RESEARCH_PROMOTION_MIN_REVIEWED ?? "", 10);
  return Number.isFinite(configured) && configured >= 5 && configured <= 500 ? configured : 25;
};

export async function GET() {
  const access = await getResearchOperatorAccess();
  if (!access.ok) return accessError(access.reason);

  try {
    const [runs, observations, deletionEvents] = await Promise.all([
      listResearchOperatorRuns(),
      listResearchComparisonObservations(),
      listResearchDeletionAuditEvents(),
    ]);
    await recordResearchOperatorAudit({ operatorId: access.participant.id, action: "view-report" });
    const safeRuns = runs.map((run) => ({
      id: run.id,
      status: run.status,
      createdAt: run.createdAt,
      deleteAfter: run.deleteAfter,
      assignedStrategy: run.assignedStrategy,
      displayedStrategy: run.displayedStrategy,
      displayOverrideReason: run.displayOverrideReason,
      adjudicationStatus: run.adjudicationStatus,
      adjudicatedAt: run.adjudicatedAt,
      attempts: run.attempts.map((attempt) => ({
        strategy: attempt.strategy,
        status: attempt.status,
        model: attempt.model,
        promptVersion: attempt.promptVersion,
        schemaVersion: attempt.schemaVersion,
        inputTokens: attempt.inputTokens,
        outputTokens: attempt.outputTokens,
        totalTokens: attempt.totalTokens,
        latencyMs: attempt.latencyMs,
        estimatedCostUsd: attempt.estimatedCostUsd,
        errorCode: attempt.errorCode,
      })),
    }));
    return NextResponse.json({
      report: buildResearchOperatorReport({ runs, observations, minimumReviewedRuns: minimumReviewedRuns() }),
      runs: safeRuns,
      observations,
      deletionEvents,
    });
  } catch {
    return NextResponse.json({ error: "research_operator_report_unavailable" }, { status: 503 });
  }
}
