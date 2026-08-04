import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { extractPdfText } from "@vehicleos/server";
import { getResearchAccess } from "../../../../lib/research-import/access";
import { selectDisplayedAttempt } from "../../../../lib/research-import/experiment";
import {
  extractResearchCarfaxPdfDraft,
  extractResearchCarfaxTextDraft,
  type ResearchExtractionResult,
} from "../../../../lib/research-import/openai-extractor";
import {
  RESEARCH_IMPORT_BUCKET,
  claimResearchImportRunForProcessing,
  completeResearchImportQuota,
  createResearchImportAttempts,
  deleteResearchImportRun,
  getResearchParticipantQuota,
  listResearchImportRuns,
  releaseResearchImportQuota,
  refreshResearchComparisonObservation,
  updateResearchImportRun,
  updateResearchImportSourceAnalysis,
} from "../../../../lib/research-import/repository";
import { researchDraftLimit, researchQuotaSubject } from "../../../../lib/research-import/quota";
import type { ResearchAttemptStoreInput, ResearchExtractionStrategy } from "../../../../lib/research-import/types";
import { createAdminClient } from "../../../../lib/supabase/admin";

export const runtime = "nodejs";
// A direct PDF request can include page-image processing. This is deliberately
// longer than the request's 100-second model timeout so the run can persist its
// paired-attempt telemetry and quota outcome before Vercel ends the function.
export const maxDuration = 120;
export const dynamic = "force-dynamic";

const MAX_IMPORT_PDF_BYTES = 15 * 1024 * 1024;

const attemptLog = (attempt: ResearchAttemptStoreInput) => ({
  strategy: attempt.strategy,
  status: attempt.status,
  errorCode: attempt.errorCode ?? null,
  model: attempt.model,
  inputCharacterCount: attempt.inputCharacterCount ?? null,
  latencyMs: attempt.latencyMs ?? null,
  totalTokens: attempt.totalTokens ?? null,
  providerRequestId: attempt.providerRequestId ?? null,
});

const safeErrorClass = (error: unknown): string =>
  error instanceof Error && /^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/.test(error.name)
    ? error.name
    : "unknown";

const accessError = (reason: "not-research-surface" | "sign-in-required" | "not-invited") => {
  const status = reason === "sign-in-required" ? 401 : reason === "not-invited" ? 403 : 404;
  return NextResponse.json({ error: reason.replaceAll("-", "_") }, { status });
};

const resultToAttempt = (input: {
  runId: string;
  strategy: ResearchExtractionStrategy;
  result: ResearchExtractionResult;
  inputCharacterCount: number | null;
}): ResearchAttemptStoreInput => ({
  runId: input.runId,
  strategy: input.strategy,
  status: input.result.ok
    ? "extracted"
    : input.result.errorCode === "model-not-configured"
      ? "model-not-configured"
      : "extract-failed",
  model: input.result.model,
  inputCharacterCount: input.inputCharacterCount,
  inputTokens: input.result.inputTokens,
  outputTokens: input.result.outputTokens,
  totalTokens: input.result.totalTokens,
  latencyMs: input.result.latencyMs,
  estimatedCostUsd: input.result.estimatedCostUsd,
  providerRequestId: input.result.providerRequestId,
  schemaValid: input.result.schemaValid,
  usableDraft: input.result.usableDraft,
  draft: input.result.ok ? input.result.draft : null,
  errorCode: input.result.ok ? null : input.result.errorCode,
});

export async function GET() {
  const access = await getResearchAccess();
  if (!access.ok) return accessError(access.reason);

  const quotaSubject = researchQuotaSubject(access.participant.email);
  if (!quotaSubject) return NextResponse.json({ error: "research_quota_not_configured" }, { status: 503 });

  try {
    const [runs, quota] = await Promise.all([
      listResearchImportRuns(access.participant.id),
      getResearchParticipantQuota({ subjectHmac: quotaSubject, limit: researchDraftLimit() }),
    ]);
    return NextResponse.json({ runs, quota });
  } catch {
    return NextResponse.json({ error: "research_not_configured" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const access = await getResearchAccess();
  if (!access.ok) return accessError(access.reason);

  let body: { runId?: unknown; consent?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (body.consent !== true) return NextResponse.json({ error: "consent_required" }, { status: 400 });
  if (typeof body.runId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.runId)) {
    return NextResponse.json({ error: "invalid_run_id" }, { status: 400 });
  }

  let claimed;
  try {
    claimed = await claimResearchImportRunForProcessing({
      id: body.runId,
      userId: access.participant.id,
    });
  } catch {
    return NextResponse.json({ error: "research_not_configured_or_unavailable" }, { status: 503 });
  }
  if (!claimed) return NextResponse.json({ error: "upload_not_ready_or_already_processed" }, { status: 409 });

  try {
    const admin = createAdminClient();
    const { data: blob, error: downloadError } = await admin.storage
      .from(RESEARCH_IMPORT_BUCKET)
      .download(claimed.storageKey);
    if (downloadError || !blob) throw new Error(downloadError?.message ?? "Uploaded PDF is unavailable");
    const pdfBuffer = Buffer.from(await blob.arrayBuffer());
    if (pdfBuffer.length === 0 || pdfBuffer.length > MAX_IMPORT_PDF_BYTES || pdfBuffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      await deleteResearchImportRun({ id: claimed.id, userId: access.participant.id });
      return NextResponse.json({ error: "invalid_pdf" }, { status: 415 });
    }
    const contentSha256 = createHash("sha256").update(pdfBuffer).digest("hex");
    if (pdfBuffer.length !== claimed.fileBytes || contentSha256 !== claimed.contentSha256) {
      await deleteResearchImportRun({ id: claimed.id, userId: access.participant.id });
      return NextResponse.json({ error: "upload_integrity_mismatch" }, { status: 409 });
    }

    let rawText = "";
    try {
      rawText = await extractPdfText(pdfBuffer);
    } catch {
      rawText = "";
    }
    await updateResearchImportSourceAnalysis({
      id: claimed.id,
      userId: access.participant.id,
      contentSha256,
      fileBytes: pdfBuffer.length,
      textCharacterCount: rawText.length,
    });

    const baselinePromise: Promise<ResearchAttemptStoreInput> = rawText.trim()
      ? extractResearchCarfaxTextDraft({ rawText }).then((result) =>
          resultToAttempt({ runId: claimed.id, strategy: "text-first", result, inputCharacterCount: rawText.length }),
        )
      : Promise.resolve({
          runId: claimed.id,
          strategy: "text-first",
          status: "text-unavailable",
          model: null,
          inputCharacterCount: 0,
          schemaValid: null,
          usableDraft: false,
          errorCode: "pdf-text-unavailable",
        });
    const challengerPromise = extractResearchCarfaxPdfDraft({ pdfBuffer, fileName: "carfax.pdf" }).then((result) =>
      resultToAttempt({ runId: claimed.id, strategy: "direct-pdf", result, inputCharacterCount: null }),
    );

    const attempts = await Promise.all([baselinePromise, challengerPromise]);
    // Do not log the PDF, extracted text, filename, draft, or provider body.
    // These compact fields make a failed run diagnosable in Vercel without
    // compromising the cohort's document-privacy boundary.
    const failedAttempts = attempts.filter((attempt) => attempt.status !== "extracted");
    if (failedAttempts.length > 0) {
      console.warn("research_import_attempt_failure", {
        runId: claimed.id,
        attempts: failedAttempts.map(attemptLog),
      });
    } else {
      console.info("research_import_attempts_completed", {
        runId: claimed.id,
        attempts: attempts.map(attemptLog),
      });
    }
    await createResearchImportAttempts(attempts);
    const selection = selectDisplayedAttempt({ assignedStrategy: claimed.assignedStrategy, attempts });
    const run = await updateResearchImportRun({
      id: claimed.id,
      userId: access.participant.id,
      status: selection.status,
      model: selection.model,
      displayedStrategy: selection.displayedStrategy,
      displayOverrideReason: selection.overrideReason,
      draft: selection.draft,
      errorCode: selection.errorCode,
    });
    if (!run) throw new Error("Research run disappeared before extraction completed");
    if (selection.status === "extracted") {
      const completed = await completeResearchImportQuota(run.id);
      if (!completed) throw new Error("Research quota reservation was unavailable");
    } else {
      await releaseResearchImportQuota(run.id);
    }
    await refreshResearchComparisonObservation(run.id).catch(() => null);
    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    console.error("research_import_pipeline_failed", {
      runId: claimed.id,
      errorClass: safeErrorClass(error),
    });
    await releaseResearchImportQuota(claimed.id).catch(() => null);
    await updateResearchImportRun({
      id: claimed.id,
      userId: access.participant.id,
      status: "extract-failed",
      errorCode: "paired-pipeline-failed",
      draft: null,
      displayedStrategy: null,
      displayOverrideReason: null,
    }).catch(() => null);
    return NextResponse.json({ error: "research_not_configured_or_unavailable" }, { status: 503 });
  }
}
