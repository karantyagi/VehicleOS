import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getResearchAccess } from "../../../../lib/research-import/access";
import { assignResearchStrategy } from "../../../../lib/research-import/experiment";
import {
  createResearchImportRun,
  discardInitializedResearchImportRun,
  getResearchParticipantQuota,
  reserveResearchImportQuota,
} from "../../../../lib/research-import/repository";
import { researchDraftLimit, researchQuotaSubject } from "../../../../lib/research-import/quota";
import { RESEARCH_CONSENT_VERSION } from "../../../../lib/research-import/types";
import { sanitizeEvidenceFileName } from "../../../../lib/receipt-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMPORT_PDF_BYTES = 15 * 1024 * 1024;
const DEFAULT_RETENTION_DAYS = 30;

const accessError = (reason: "not-research-surface" | "sign-in-required" | "not-invited") => {
  const status = reason === "sign-in-required" ? 401 : reason === "not-invited" ? 403 : 404;
  return NextResponse.json({ error: reason.replaceAll("-", "_") }, { status });
};

const retentionDeadline = (): string => {
  const configured = Number.parseInt(process.env.RESEARCH_RETENTION_DAYS ?? "", 10);
  const days = Number.isFinite(configured) && configured >= 1 && configured <= 90 ? configured : DEFAULT_RETENTION_DAYS;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
};

export async function POST(request: Request) {
  const access = await getResearchAccess();
  if (!access.ok) return accessError(access.reason);

  let body: { fileName?: unknown; fileBytes?: unknown; fileType?: unknown; contentSha256?: unknown; consent?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (body.consent !== true) return NextResponse.json({ error: "consent_required" }, { status: 400 });
  if (typeof body.fileName !== "string") return NextResponse.json({ error: "file_required" }, { status: 400 });
  if (typeof body.fileBytes !== "number" || !Number.isInteger(body.fileBytes) || body.fileBytes <= 0) {
    return NextResponse.json({ error: "file_empty" }, { status: 400 });
  }
  if (body.fileBytes > MAX_IMPORT_PDF_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  if (body.fileType !== "application/pdf" && !body.fileName.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "pdf_required" }, { status: 415 });
  }
  if (typeof body.contentSha256 !== "string" || !/^[a-f0-9]{64}$/i.test(body.contentSha256)) {
    return NextResponse.json({ error: "invalid_file_digest" }, { status: 400 });
  }

  const quotaSubject = researchQuotaSubject(access.participant.email);
  if (!quotaSubject) return NextResponse.json({ error: "research_quota_not_configured" }, { status: 503 });

  const runId = randomUUID();
  const safeFileName = sanitizeEvidenceFileName(body.fileName, "carfax.pdf");
  const storageKey = `${access.participant.id}/${runId}/source.pdf`;
  let initialized = false;
  try {
    const run = await createResearchImportRun({
      id: runId,
      userId: access.participant.id,
      consentVersion: RESEARCH_CONSENT_VERSION,
      retainForEvals: true,
      fileName: safeFileName,
      fileBytes: body.fileBytes,
      contentSha256: body.contentSha256.toLowerCase(),
      storageKey,
      textCharacterCount: null,
      status: "uploaded",
      model: null,
      deleteAfter: retentionDeadline(),
      assignedStrategy: assignResearchStrategy(runId),
    });
    initialized = true;
    const reserved = await reserveResearchImportQuota({
      runId,
      subjectHmac: quotaSubject,
      limit: researchDraftLimit(),
    });
    if (!reserved) {
      await discardInitializedResearchImportRun({ id: runId, userId: access.participant.id });
      const quota = await getResearchParticipantQuota({ subjectHmac: quotaSubject, limit: researchDraftLimit() });
      if (quota.activeSlots > 0) return NextResponse.json({ error: "research_import_in_progress" }, { status: 409 });
      return NextResponse.json({ error: "research_quota_reached" }, { status: 429 });
    }
    return NextResponse.json({ run, upload: { path: storageKey } }, { status: 201 });
  } catch {
    if (initialized) await discardInitializedResearchImportRun({ id: runId, userId: access.participant.id }).catch(() => null);
    return NextResponse.json({ error: "research_not_configured_or_unavailable" }, { status: 503 });
  }
}
