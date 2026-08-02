"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { ResearchImportDraft, ResearchImportRun, ResearchServiceRecord } from "@/lib/research-import/types";

type PortalError = string | null;

const statusCopy: Record<ResearchImportRun["status"], string> = {
  uploaded: "Uploaded",
  "text-unavailable": "This PDF does not contain selectable text.",
  "model-not-configured": "The document was stored, but the research extractor is not enabled yet.",
  extracted: "Draft ready for your review.",
  "extract-failed": "We could not create a usable draft from this document.",
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
  })[error] ?? "Something went wrong. Please try again.";

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
            Fix anything that is wrong or incomplete. Your corrections are research feedback; they do not change your
            VehicleOS account or maintenance history.
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
              Model confidence: {Math.round(record.confidence * 100)}%. Source: {record.evidence || "No source excerpt."}
            </p>
          </article>
        ))}
      </div>

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

export function ResearchCohortPage({ email, invited }: { email: string | null; invited: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [retainForEvals, setRetainForEvals] = useState(false);
  const [runs, setRuns] = useState<ResearchImportRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(invited);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<PortalError>(null);

  useEffect(() => {
    if (!invited) return;
    const load = async () => {
      try {
        const response = await fetch("/api/research/imports");
        const body = (await response.json()) as { runs?: ResearchImportRun[]; error?: string };
        if (!response.ok) throw new Error(readableError(body.error ?? ""));
        setRuns(body.runs ?? []);
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
    try {
      const data = new FormData();
      data.set("file", file);
      data.set("consent", String(consent));
      data.set("retainForEvals", String(retainForEvals));
      const response = await fetch("/api/research/imports", { method: "POST", body: data });
      const body = (await response.json()) as { run?: ResearchImportRun; error?: string };
      if (!response.ok || !body.run) throw new Error(readableError(body.error ?? ""));
      setRuns((current) => [body.run as ResearchImportRun, ...current]);
      setFile(null);
      setConsent(false);
      setRetainForEvals(false);
    } catch (submitError) {
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
    <main id="main-content" className="mx-auto min-h-screen max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="border-b border-border pb-6">
        <p className="text-sm font-medium text-primary">VehicleOS · invite-only research</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Help us make CARFAX import trustworthy.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Upload a CARFAX service-history PDF, review the draft, and tell us what it got wrong. This is research—not the
          VehicleOS owner app. Nothing here changes your maintenance history.
        </p>
        {email ? <p className="mt-3 text-xs text-muted-foreground">Signed in as {email}</p> : null}
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
          <form onSubmit={(event) => void submit(event)} className="mt-8 rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">1. Upload your CARFAX PDF</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Use the CARFAX print-to-PDF export. PDFs must be 15 MB or smaller and contain selectable text.
            </p>
            <label className="mt-4 block rounded-lg border border-dashed border-border bg-background p-4 text-sm">
              <span className="font-medium">Choose CARFAX PDF</span>
              <input
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
              <span>
                I allow VehicleOS to process this PDF to make a research draft. When the extractor is enabled, only text
                extracted from the PDF (not the raw PDF) is sent to OpenAI&apos;s API. The PDF stays in private VehicleOS
                research storage for up to 30 days, and I can delete it here at any time.
              </span>
            </label>
            <label className="mt-3 flex items-start gap-3 text-sm leading-5 text-muted-foreground">
              <input
                type="checkbox"
                checked={retainForEvals}
                onChange={(event) => setRetainForEvals(event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                Optional: VehicleOS may retain a de-identified correction as a private regression test. The original PDF
                still follows the 30-day deletion window.
              </span>
            </label>

            {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
            <button
              type="submit"
              disabled={!file || !consent || submitting}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Processing…" : "Create research draft"}
            </button>
          </form>

          <section className="mt-8">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">2. Review your drafts</h2>
              <span className="text-xs text-muted-foreground">{loadingRuns ? "Loading…" : runs.length + " uploads"}</span>
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
    </main>
  );
}
