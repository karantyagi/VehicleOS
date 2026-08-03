"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CARFAX_PDF_INSTRUCTIONS } from "@/lib/record-import-types";
import { RESEARCH_IMPORT_BUCKET, type ResearchImportDraft, type ResearchImportRun, type ResearchServiceRecord } from "@/lib/research-import/types";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

type PortalError = string | null;

type ResearchParticipantQuota = {
  successfulDrafts: number;
  activeSlots: number;
  limit: number;
  remaining: number;
};

const statusCopy: Record<ResearchImportRun["status"], string> = {
  uploaded: "Uploaded",
  processing: "Creating your draft.",
  "text-unavailable": "This PDF does not contain selectable text.",
  "model-not-configured": "The document was stored, but the research extractor is not enabled yet.",
  extracted: "Draft ready for your review.",
  "extract-failed": "This PDF did not produce a reviewable draft. It did not use one of your pilot slots. Try CARFAX Print, then Save as PDF.",
  reviewed: "Your corrections were saved.",
};

const readableError = (error: string): string =>
  ({
    consent_required: "Please agree to the research consent before uploading.",
    file_required: "Choose a CARFAX PDF first.",
    file_empty: "That file is empty. Please choose the PDF again.",
    file_too_large: "This cohort accepts PDFs up to 15 MB.",
    pdf_required: "Please choose a PDF file.",
    invalid_pdf: "The file did not look like a valid PDF.",
    research_not_configured: "This research portal is not configured yet. Please tell Karan.",
    research_not_configured_or_unavailable: "The research service is unavailable. Please try again later.",
    upload_not_ready_or_already_processed: "That upload could not be processed. Please upload the PDF again.",
    invalid_file_digest: "We could not verify that PDF. Please choose it again.",
    research_quota_reached: "You have reached this pilot's usable-draft limit. Ask Karan if you have another PDF to include.",
    research_import_in_progress: "Your current PDF is still being processed. Please wait before starting another one.",
    research_quota_not_configured: "This research portal is not configured yet. Please tell Karan.",
  })[error] ?? "Something went wrong. Please try again.";

const sha256 = async (file: File): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const cloneDraft = (draft: ResearchImportDraft): ResearchImportDraft => ({
  ...draft,
  records: draft.records.map((record) => ({ ...record, lineItems: [...record.lineItems] })),
  warnings: [...draft.warnings],
});

const updateRecord = (
  draft: ResearchImportDraft,
  index: number,
  patch: Partial<ResearchServiceRecord>,
): ResearchImportDraft => ({
  ...draft,
  records: draft.records.map((record, recordIndex) => (recordIndex === index ? { ...record, ...patch } : record)),
});

const emptyRecord = (): ResearchServiceRecord => ({
  serviceDate: null,
  mileage: null,
  provider: null,
  lineItems: [],
  confidence: 1,
  evidence: "Added by owner",
});

function ResearchRunReview({
  run,
  onSave,
}: {
  run: ResearchImportRun;
  onSave: (runId: string, ownerDraft: ResearchImportDraft) => Promise<void>;
}) {
  const initialDraft = run.ownerDraft ?? run.draft;
  const [draft, setDraft] = useState<ResearchImportDraft | null>(initialDraft ? cloneDraft(initialDraft) : null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<PortalError>(null);

  useEffect(() => {
    setDraft(initialDraft ? cloneDraft(initialDraft) : null);
  }, [run.id, run.ownerDraft, run.draft]);

  if (!draft) return null;

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(run.id, draft);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save your review.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-5 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Review the draft</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            You are the final check. Fix anything that is wrong or incomplete. Nothing here changes your VehicleOS
            maintenance history.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {draft.records.length} visits
        </span>
      </div>

      <label className="mt-4 block text-sm font-medium">
        VIN shown in the document
        <input
          value={draft.vehicleVin ?? ""}
          onChange={(event) => setDraft({ ...draft, vehicleVin: event.target.value || null })}
          placeholder="Not shown"
          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </label>

      <div className="mt-4 space-y-4">
        {draft.records.map((record, index) => (
          <article key={index} className="rounded-lg border border-border bg-background p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Service date
                <input
                  value={record.serviceDate ?? ""}
                  onChange={(event) =>
                    setDraft(updateRecord(draft, index, { serviceDate: event.target.value || null }))
                  }
                  placeholder="YYYY-MM-DD"
                  className="mt-1 h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                />
              </label>
              <label className="text-sm font-medium">
                Mileage
                <input
                  inputMode="numeric"
                  value={record.mileage ?? ""}
                  onChange={(event) => {
                    const mileage = Number(event.target.value);
                    setDraft(
                      updateRecord(draft, index, {
                        mileage: event.target.value === "" || !Number.isFinite(mileage) ? null : mileage,
                      }),
                    );
                  }}
                  placeholder="Not shown"
                  className="mt-1 h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                />
              </label>
              <label className="text-sm font-medium sm:col-span-2">
                Shop or provider
                <input
                  value={record.provider ?? ""}
                  onChange={(event) => setDraft(updateRecord(draft, index, { provider: event.target.value || null }))}
                  placeholder="Not shown"
                  className="mt-1 h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                />
              </label>
              <label className="text-sm font-medium sm:col-span-2">
                Work performed <span className="font-normal text-muted-foreground">(one item per line)</span>
                <textarea
                  value={record.lineItems.join("\n")}
                  onChange={(event) =>
                    setDraft(
                      updateRecord(draft, index, {
                        lineItems: event.target.value
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean),
                      }),
                    )
                  }
                  rows={Math.max(2, record.lineItems.length)}
                  className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                />
              </label>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Found in your PDF: {record.evidence || "No matching text was found."}
            </p>
            <button
              type="button"
              onClick={() => setDraft({ ...draft, records: draft.records.filter((_, recordIndex) => recordIndex !== index) })}
              className="mt-3 text-sm font-medium text-destructive underline-offset-4 hover:underline"
            >
              Remove this visit
            </button>
          </article>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setDraft({ ...draft, records: [...draft.records, emptyRecord()] })}
        className="mt-4 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
      >
        Add a missed visit
      </button>

      {draft.warnings.length > 0 ? (
        <p className="mt-4 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
          {draft.warnings.join(" ")}
        </p>
      ) : null}

      {saveError ? <p className="mt-3 text-sm text-destructive">{saveError}</p> : null}
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save my corrections"}
      </button>
    </section>
  );
}

export function ResearchCohortPage({ invited }: { invited: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [runs, setRuns] = useState<ResearchImportRun[]>([]);
  const [quota, setQuota] = useState<ResearchParticipantQuota | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(invited);
  const [submitting, setSubmitting] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [error, setError] = useState<PortalError>(null);
  const importInProgress = (quota?.activeSlots ?? 0) > 0;
  const pilotLimitReached = quota?.remaining === 0;

  useEffect(() => {
    if (!invited) return;
    const load = async () => {
      try {
        const response = await fetch("/api/research/imports");
        const body = (await response.json()) as { runs?: ResearchImportRun[]; quota?: ResearchParticipantQuota; error?: string };
        if (!response.ok) throw new Error(readableError(body.error ?? ""));
        setRuns(body.runs ?? []);
        setQuota(body.quota ?? null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load your research uploads.");
      } finally {
        setLoadingRuns(false);
      }
    };
    void load();
  }, [invited]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError("Choose a CARFAX PDF first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    let initializedRunId: string | null = null;
    let uploadCompleted = false;
    try {
      const initResponse = await fetch("/api/research/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileBytes: file.size,
          fileType: file.type,
          contentSha256: await sha256(file),
          consent,
        }),
      });
      const initialized = (await initResponse.json()) as {
        run?: ResearchImportRun;
        upload?: { path: string };
        error?: string;
      };
      if (!initResponse.ok || !initialized.run || !initialized.upload) {
        throw new Error(readableError(initialized.error ?? ""));
      }
      initializedRunId = initialized.run.id;

      const supabase = createSupabaseClient();
      const { error: uploadError } = await supabase.storage
        .from(RESEARCH_IMPORT_BUCKET)
        .upload(initialized.upload.path, file, { contentType: "application/pdf", upsert: false });
      if (uploadError) throw new Error("The private upload failed. Please try again.");
      uploadCompleted = true;

      const response = await fetch("/api/research/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: initialized.run.id, consent }),
      });
      const body = (await response.json()) as { run?: ResearchImportRun; error?: string };
      if (!response.ok || !body.run) throw new Error(readableError(body.error ?? ""));
      setRuns((current) => [body.run as ResearchImportRun, ...current]);
      if (body.run.status === "extracted") {
        setQuota((current) => current
          ? { ...current, successfulDrafts: current.successfulDrafts + 1, remaining: Math.max(0, current.remaining - 1) }
          : current);
      }
      setFile(null);
      setFileInputKey((current) => current + 1);
      setConsent(false);
    } catch (submitError) {
      if (initializedRunId && !uploadCompleted) {
        await fetch(`/api/research/imports/${initializedRunId}`, { method: "DELETE" }).catch(() => null);
      } else if (uploadCompleted) {
        const latest = await fetch("/api/research/imports").then((response) => response.json()).catch(() => null) as { runs?: ResearchImportRun[] } | null;
        if (latest?.runs) setRuns(latest.runs);
      }
      setError(submitError instanceof Error ? submitError.message : "Could not process your PDF.");
    } finally {
      setSubmitting(false);
    }
  };

  const saveReview = async (runId: string, ownerDraft: ResearchImportDraft) => {
    const response = await fetch("/api/research/imports/" + runId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerDraft }),
    });
    const body = (await response.json()) as { run?: ResearchImportRun; error?: string };
    if (!response.ok || !body.run) throw new Error(readableError(body.error ?? ""));
    setRuns((current) => current.map((run) => (run.id === runId ? (body.run as ResearchImportRun) : run)));
  };

  const deleteRun = async (runId: string) => {
    if (!window.confirm("Delete this PDF and its research result now? This cannot be undone.")) return;
    setError(null);
    try {
      const response = await fetch("/api/research/imports/" + runId, { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        const body = (await response.json()) as { error?: string };
        throw new Error(readableError(body.error ?? ""));
      }
      setRuns((current) => current.filter((run) => run.id !== runId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete this research upload.");
    }
  };

  return (
    <section>
      <header className="border-b border-border pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Help improve CARFAX import.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Upload a CARFAX PDF. We use an AI-assisted parser to make a draft for you to check. Nothing here is added to
          your VehicleOS maintenance history.
        </p>
      </header>

      {!invited ? (
        <section className="mt-8 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">This account is not in the cohort yet.</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Ask Karan for an invitation using the email address you signed in with. The portal stays closed to everyone
            else while we validate import quality.
          </p>
        </section>
      ) : (
        <>
          <section className="mt-6 rounded-xl border border-border bg-[hsl(var(--surface-inset))] p-5">
            <h2 className="text-lg font-semibold">How to get your PDF</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
              {CARFAX_PDF_INSTRUCTIONS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <form onSubmit={(event) => void submit(event)} className="mt-8 rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Upload a CARFAX PDF</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              In CARFAX, choose Print, then save as a PDF. Files can be up to 15 MB. This pilot allows up to {quota?.limit ?? 5} usable drafts; a processing failure does not use a slot.
            </p>
            <label className="mt-4 block rounded-lg border border-dashed border-border bg-background p-4 text-sm">
              <span className="font-medium">Choose CARFAX PDF</span>
              <input
                key={fileInputKey}
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="mt-2 block w-full text-sm"
              />
              {file ? <span className="mt-2 block text-xs text-muted-foreground">{file.name}</span> : null}
            </label>

            <label className="mt-4 flex items-start gap-3 text-sm leading-5">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>I agree that VehicleOS can send this PDF and its text to OpenAI, compare two import methods, and use my corrections to measure quality.</span>
            </label>
            <details className="mt-3 text-sm text-muted-foreground">
              <summary className="cursor-pointer font-medium text-foreground">How your information is used</summary>
              <p className="mt-2 leading-6">
                We keep the PDF and drafts private for up to 30 days, then delete them. OpenAI does not train on API data
                by default, but may retain safety logs for up to 30 days. VehicleOS may keep anonymous quality counts;
                they do not include the PDF, VIN, filename, shop, draft, or your account.
              </p>
            </details>

            {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
            <button
              type="submit"
              disabled={!file || !consent || submitting || pilotLimitReached || importInProgress}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Making your draft…" : importInProgress ? "Current import processing" : pilotLimitReached ? "Pilot limit reached" : "Make my draft"}
            </button>
          </form>

          <section className="mt-8">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">Your drafts</h2>
              <span className="text-xs text-muted-foreground">
                {loadingRuns ? "Loading…" : quota ? `${quota.successfulDrafts} of ${quota.limit} usable drafts` : `${runs.length} uploads`}
              </span>
            </div>
            {!loadingRuns && runs.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Your first draft will appear here after upload.
              </p>
            ) : null}
            <div className="mt-3 space-y-4">
              {runs.map((run) => (
                <article key={run.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{run.fileName}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{statusCopy[run.status]}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Delete by {new Date(run.deleteAfter).toLocaleDateString()}
                        {run.model ? " · " + run.model : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteRun(run.id)}
                      className="text-sm font-medium text-destructive underline-offset-4 hover:underline"
                    >
                      Delete PDF
                    </button>
                  </div>
                  <ResearchRunReview run={run} onSave={saveReview} />
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
