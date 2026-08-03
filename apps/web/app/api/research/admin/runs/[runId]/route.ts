import { NextResponse } from "next/server";
import { getResearchOperatorAccess } from "../../../../../../lib/research-import/access";
import {
  getResearchOperatorRunDetail,
  recordResearchOperatorAudit,
  updateResearchAdjudication,
} from "../../../../../../lib/research-import/repository";
import type { ResearchAdjudicationStatus } from "../../../../../../lib/research-import/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: { runId: string } };

const accessError = (reason: "not-research-surface" | "sign-in-required" | "not-invited") => {
  const status = reason === "sign-in-required" ? 401 : reason === "not-invited" ? 403 : 404;
  return NextResponse.json({ error: reason.replaceAll("-", "_") }, { status });
};

export async function GET(_request: Request, context: RouteContext) {
  const access = await getResearchOperatorAccess();
  if (!access.ok) return accessError(access.reason);

  try {
    await recordResearchOperatorAudit({
      operatorId: access.participant.id,
      action: "view-run-detail",
      runId: context.params.runId,
    });
    const detail = await getResearchOperatorRunDetail(context.params.runId);
    if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(detail);
  } catch {
    return NextResponse.json({ error: "research_operator_detail_unavailable" }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await getResearchOperatorAccess();
  if (!access.ok) return accessError(access.reason);

  let body: { status?: ResearchAdjudicationStatus; notes?: unknown };
  try {
    body = (await request.json()) as { status?: ResearchAdjudicationStatus; notes?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.status || !["confirmed", "corrected", "not-required"].includes(body.status)) {
    return NextResponse.json({ error: "invalid_adjudication_status" }, { status: 400 });
  }
  if (body.notes !== undefined && body.notes !== null && typeof body.notes !== "string") {
    return NextResponse.json({ error: "invalid_adjudication_notes" }, { status: 400 });
  }
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  if (notes.length > 2000) return NextResponse.json({ error: "adjudication_notes_too_large" }, { status: 413 });

  try {
    const updated = await updateResearchAdjudication({
      runId: context.params.runId,
      operatorId: access.participant.id,
      status: body.status as Exclude<ResearchAdjudicationStatus, "pending">,
      notes: notes || null,
    });
    if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await recordResearchOperatorAudit({
      operatorId: access.participant.id,
      action: "adjudicate-run",
      runId: context.params.runId,
    });
    return NextResponse.json({ updated: true });
  } catch {
    return NextResponse.json({ error: "research_adjudication_unavailable" }, { status: 503 });
  }
}
