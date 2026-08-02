import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { extractPdfText } from "@vehicleos/server";
import { getResearchAccess } from "../../../../lib/research-import/access";
import { DEFAULT_RESEARCH_IMPORT_MODEL, extractResearchCarfaxDraft } from "../../../../lib/research-import/openai-extractor";
import {
  RESEARCH_IMPORT_BUCKET,
  createResearchImportRun,
  listResearchImportRuns,
} from "../../../../lib/research-import/repository";
import { sanitizeEvidenceFileName } from "../../../../lib/receipt-storage";
import { createAdminClient } from "../../../../lib/supabase/admin";

export const runtime = "nodejs";

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

export async function GET() {
  const access = await getResearchAccess();
  if (!access.ok) return accessError(access.reason);

  try {
    return NextResponse.json({ runs: await listResearchImportRuns(access.participant.id) });
  } catch {
    return NextResponse.json({ error: "research_not_configured" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const access = await getResearchAccess();
  if (!access.ok) return accessError(access.reason);

  const formData = await request.formData();
  const file = formData.get("file");
  const consent = formData.get("consent") === "true";

  if (!consent) return NextResponse.json({ error: "consent_required" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "file_required" }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "file_empty" }, { status: 400 });
  if (file.size > MAX_IMPORT_PDF_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "pdf_required" }, { status: 415 });
  }

  const pdfBuffer = Buffer.from(await file.arrayBuffer());
  if (pdfBuffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    return NextResponse.json({ error: "invalid_pdf" }, { status: 415 });
  }

  const runId = randomUUID();
  const safeFileName = sanitizeEvidenceFileName(file.name, "carfax.pdf");
  const storageKey = access.participant.id + "/" + runId + "/" + safeFileName;
  const deleteAfter = retentionDeadline();

  try {
    const admin = createAdminClient();
    const { error: storageError } = await admin.storage.from(RESEARCH_IMPORT_BUCKET).upload(storageKey, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });
    if (storageError) throw new Error(storageError.message);

    let rawText = "";
    try {
      rawText = await extractPdfText(pdfBuffer);
    } catch {
      rawText = "";
    }

    const baseInput = {
      id: runId,
      userId: access.participant.id,
      consentVersion: "research-cohort.v2",
      retainForEvals: true,
      fileName: safeFileName,
      fileBytes: pdfBuffer.byteLength,
      contentSha256: createHash("sha256").update(pdfBuffer).digest("hex"),
      storageKey,
      deleteAfter,
    };

    if (!rawText.trim()) {
      const run = await createResearchImportRun({
        ...baseInput,
        textCharacterCount: 0,
        status: "text-unavailable",
        model: null,
        errorCode: "pdf-text-unavailable",
      });
      return NextResponse.json({ run }, { status: 201 });
    }

    const extraction = await extractResearchCarfaxDraft({ rawText });
    const run = await createResearchImportRun({
      ...baseInput,
      textCharacterCount: rawText.length,
      status: extraction.ok
        ? "extracted"
        : extraction.errorCode === "model-not-configured"
          ? "model-not-configured"
          : "extract-failed",
      model: extraction.ok
        ? extraction.model
        : process.env.OPENAI_API_KEY
          ? process.env.RESEARCH_OPENAI_MODEL ?? DEFAULT_RESEARCH_IMPORT_MODEL
          : null,
      draft: extraction.ok ? extraction.draft : null,
      errorCode: extraction.ok ? null : extraction.errorCode,
    });
    return NextResponse.json({ run }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "research_not_configured_or_unavailable" }, { status: 503 });
  }
}
