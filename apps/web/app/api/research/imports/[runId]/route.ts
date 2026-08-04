import { NextResponse } from "next/server";
import { getResearchAccess } from "../../../../../lib/research-import/access";
import { parseResearchImportDraft } from "../../../../../lib/research-import/draft";
import { researchReviewProgress } from "../../../../../lib/research-import/review";
import {
  deleteResearchImportRun,
  getResearchParticipantPdfUrl,
  refreshResearchComparisonObservation,
  updateResearchImportRun,
} from "../../../../../lib/research-import/repository";

type RouteContext = { params: { runId: string } };

const accessError = (reason: "not-research-surface" | "sign-in-required" | "not-invited") => {
  const status = reason === "sign-in-required" ? 401 : reason === "not-invited" ? 403 : 404;
  return NextResponse.json({ error: reason.replaceAll("-", "_") }, { status });
};

export async function GET(_request: Request, context: RouteContext) {
  const access = await getResearchAccess();
  if (!access.ok) return accessError(access.reason);

  try {
    const pdfUrl = await getResearchParticipantPdfUrl({ id: context.params.runId, userId: access.participant.id });
    if (!pdfUrl) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.redirect(pdfUrl);
  } catch {
    return NextResponse.json({ error: "research_pdf_unavailable" }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await getResearchAccess();
  if (!access.ok) return accessError(access.reason);

  const body = (await request.json()) as { ownerDraft?: unknown; reviewComplete?: unknown };
  const ownerDraft = parseResearchImportDraft(body.ownerDraft);
  if (!ownerDraft) return NextResponse.json({ error: "invalid_owner_draft" }, { status: 400 });
  if (body.reviewComplete !== undefined && typeof body.reviewComplete !== "boolean") {
    return NextResponse.json({ error: "invalid_review_completion" }, { status: 400 });
  }
  const reviewComplete = body.reviewComplete === true;
  if (reviewComplete && !researchReviewProgress(ownerDraft).complete) {
    return NextResponse.json({ error: "review_incomplete" }, { status: 400 });
  }
  if (JSON.stringify(ownerDraft).length > 100_000) {
    return NextResponse.json({ error: "owner_draft_too_large" }, { status: 413 });
  }

  try {
    const run = await updateResearchImportRun({
      id: context.params.runId,
      userId: access.participant.id,
      status: reviewComplete ? "reviewed" : "extracted",
      ownerDraft,
    });
    if (!run) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await refreshResearchComparisonObservation(run.id);
    return NextResponse.json({ run });
  } catch {
    return NextResponse.json({ error: "research_not_configured_or_unavailable" }, { status: 503 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await getResearchAccess();
  if (!access.ok) return accessError(access.reason);

  try {
    const result = await deleteResearchImportRun({
      id: context.params.runId,
      userId: access.participant.id,
    });
    if (result === "not-found") return NextResponse.json({ error: "not_found" }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "research_not_configured_or_unavailable" }, { status: 503 });
  }
}
