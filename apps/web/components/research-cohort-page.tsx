"use client";

import { CheckCircle2, ChevronDown, ChevronUp, CircleAlert, FileText, LoaderCircle, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CARFAX_PDF_INSTRUCTIONS } from "@/lib/record-import-types";
import { RESEARCH_IMPORT_BUCKET, type ResearchImportDraft, type ResearchImportRun, type ResearchServiceRecord } from "@/lib/research-import/types";
import {
  applyResearchRecordReview,
  createResearchRecordReview,
  isResearchRecordRejected,
  isResearchRecordReviewComplete,
  prepareResearchDraftForReview,
  researchRecordAttention,
  researchReviewProgress,
} from "@/lib/research-import/review";
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
    review_incomplete: "Please choose an outcome for every visit and service item before finishing your review.",
  })[error] ?? "Something went wrong. Please try again.";

const sha256 = async (file: File): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const emptyRecord = (): ResearchServiceRecord => ({
  serviceDate: null,
  mileage: null,
  provider: null,
  lineItems: [],
  confidence: 1,
  evidence: "Added by owner",
  evidencePages: [],
  recordKind: "service",
  reportedBy: "owner",
  serviceDetailStatus: "unknown",
  providerLocation: { city: null, state: null, status: "not-reported", source: null },
  review: {
    visitOutcome: "corrected",
    serviceItems: [{ originalItem: null, finalItem: null, outcome: "unreviewed" }],
  },
});

type ReviewFilter = "all" | "attention" | "not-reviewed" | "complete";

const actionOutcomeCopy = {
  confirmed: "Matches report",
  corrected: "Corrected",
  "not-itemized": "Not itemized",
  "not-supported": "Not in report",
  unsure: "Not sure",
  added: "Added by you",
} as const;

const recordKindCopy = {
  service: "Service",
  inspection: "Inspection",
  registration: "Registration",
  unknown: "Record type not clear",
} as const;

const reportedByCopy = {
  shop: "Shop",
  government: "Government record",
  owner: "Owner-reported",
  diy: "DIY",
  unknown: "Reporter not clear",
} as const;

const providerLocationCopy = (record: ResearchServiceRecord): string => {
  const location = record.providerLocation;
  if (location.status === "reported" && location.city && location.state) return `${location.city}, ${location.state} (shown by CARFAX)`;
  if (location.status === "ambiguous") return "CARFAX showed more than one possible location for this provider.";
  return "CARFAX did not show a city and state for this provider.";
};

export function ResearchRunReview({
  run,
  onSave,
}: {
  run: ResearchImportRun;
  onSave: (runId: string, ownerDraft: ResearchImportDraft, reviewComplete: boolean) => Promise<void>;
}) {
  const initialDraft = run.ownerDraft ?? run.draft;
  const [draft, setDraft] = useState<ResearchImportDraft | null>(initialDraft ? prepareResearchDraftForReview(initialDraft) : null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<PortalError>(null);
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [expandedRecords, setExpandedRecords] = useState<Set<number>>(new Set());
  const [editingVisits, setEditingVisits] = useState<Set<number>>(new Set());
  const [editingServiceItems, setEditingServiceItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const nextDraft = initialDraft ? prepareResearchDraftForReview(initialDraft) : null;
    setDraft(nextDraft);
    const firstAttention = nextDraft?.records.findIndex((record) => researchRecordAttention(record).needsAttention) ?? -1;
    setExpandedRecords(firstAttention >= 0 ? new Set([firstAttention]) : new Set());
    setEditingVisits(new Set());
    setEditingServiceItems(new Set());
  }, [run.id, run.ownerDraft, run.draft]);

  if (!draft) return null;

  const replaceRecord = (index: number, update: (record: ResearchServiceRecord) => ResearchServiceRecord) => {
    setDraft((current) => current
      ? { ...current, records: current.records.map((record, recordIndex) => (recordIndex === index ? update(record) : record)) }
      : current);
  };
  const updateVisitOutcome = (index: number, visitOutcome: NonNullable<ResearchServiceRecord["review"]>["visitOutcome"]) => {
    replaceRecord(index, (record) => applyResearchRecordReview(record, { ...createResearchRecordReview(record), ...record.review, visitOutcome }));
  };
  const updateVisit = (index: number, patch: Partial<ResearchServiceRecord>) => {
    replaceRecord(index, (record) => {
      const review = { ...createResearchRecordReview(record), ...record.review, visitOutcome: "corrected" as const };
      return applyResearchRecordReview({ ...record, ...patch }, review);
    });
  };
  const updateServiceItem = (recordIndex: number, itemIndex: number, patch: Partial<NonNullable<ResearchServiceRecord["review"]>["serviceItems"][number]>) => {
    replaceRecord(recordIndex, (record) => {
      const review = { ...createResearchRecordReview(record), ...record.review };
      review.serviceItems = review.serviceItems.map((item, currentIndex) => currentIndex === itemIndex ? { ...item, ...patch } : item);
      return applyResearchRecordReview(record, review);
    });
  };
  const addServiceItem = (recordIndex: number) => {
    replaceRecord(recordIndex, (record) => {
      const review = { ...createResearchRecordReview(record), ...record.review };
      review.serviceItems = [...review.serviceItems, { originalItem: null, finalItem: "", outcome: "unreviewed" }];
      return applyResearchRecordReview(record, review);
    });
  };
  const save = async (reviewComplete: boolean) => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(run.id, draft, reviewComplete);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save your review.");
    } finally {
      setSaving(false);
    }
  };

  const progress = researchReviewProgress(draft);
  const attentionByRecord = useMemo(() => draft.records.map(researchRecordAttention), [draft.records]);
  const counts = {
    attention: draft.records.filter((record, index) => attentionByRecord[index].needsAttention && !isResearchRecordReviewComplete(record)).length,
    notReviewed: draft.records.filter((record) => !isResearchRecordReviewComplete(record)).length,
    complete: progress.reviewedVisits,
  };
  const visibleRecords = draft.records.map((record, index) => ({ record, index })).filter(({ record, index }) => {
    if (filter === "attention") return attentionByRecord[index].needsAttention && !isResearchRecordReviewComplete(record);
    if (filter === "not-reviewed") return !isResearchRecordReviewComplete(record);
    if (filter === "complete") return isResearchRecordReviewComplete(record);
    return true;
  });
  const toggleRecord = (index: number) => setExpandedRecords((current) => {
    const next = new Set(current);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    return next;
  });
  const reviewNext = () => {
    const next = draft.records.findIndex((record) => !isResearchRecordReviewComplete(record));
    if (next >= 0) {
      setFilter("all");
      setExpandedRecords(new Set([next]));
    }
  };

  return (
    <section className="mt-5 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Review every visit</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Each decision becomes research feedback. Amber rows are a shortcut, but every visit still needs a decision before you finish. Nothing here changes your VehicleOS maintenance history.</p>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{progress.reviewedVisits} of {progress.totalVisits} visits reviewed</span>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm">
        <p className="font-medium">{progress.reviewedVisits} of {progress.totalVisits} visits reviewed · {progress.reviewedServiceItems} of {progress.totalServiceItems} service items reviewed</p>
        <p className="mt-1 text-muted-foreground">Choose “not itemized” when the report does not name the work. That is useful feedback, not a model failure.</p>
      </div>
      <details className="mt-4 rounded-lg border border-border bg-background px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium">Vehicle identifier</summary>
        <label className="mt-3 block text-sm font-medium">VIN shown in the document<input value={draft.vehicleVin ?? ""} onChange={(event) => setDraft({ ...draft, vehicleVin: event.target.value || null })} placeholder="Not shown" className="mt-1 h-10 w-full rounded-md border border-input bg-card px-3 text-sm" /></label>
      </details>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {([
          ["all", `All ${draft.records.length}`],
          ["attention", `Needs attention ${counts.attention}`],
          ["not-reviewed", `Not reviewed ${counts.notReviewed}`],
          ["complete", `Complete ${counts.complete}`],
        ] as const).map(([value, label]) => <Button key={value} type="button" size="sm" variant={filter === value ? "default" : "outline"} onClick={() => setFilter(value)}>{label}</Button>)}
        <span className="flex-1" />
        <Button type="button" size="sm" variant="ghost" onClick={() => setExpandedRecords(new Set(draft.records.map((_, index) => index)))}><ChevronDown className="h-4 w-4" aria-hidden /> Expand all</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setExpandedRecords(new Set())}><ChevronUp className="h-4 w-4" aria-hidden /> Collapse all</Button>
      </div>

      <div className="mt-3 space-y-3">
        {visibleRecords.map(({ record, index }) => {
          const review = record.review ?? createResearchRecordReview(record);
          const attention = attentionByRecord[index];
          const complete = isResearchRecordReviewComplete(record);
          const rejected = isResearchRecordRejected(record);
          const open = expandedRecords.has(index);
          return (
            <article key={index} className={`rounded-lg border bg-background ${open ? "border-primary/40 shadow-sm" : "border-border"}`}>
              <button type="button" onClick={() => toggleRecord(index)} className="flex w-full items-start gap-3 p-3 text-left">
                {open ? <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{record.serviceDate ?? "Date not shown"} · {record.mileage === null ? "Mileage not shown" : `${record.mileage.toLocaleString()} mi`} · {record.provider ?? "Shop not shown"}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{rejected ? "Marked as not a service visit" : record.lineItems.join(" · ") || "No service item listed"}</span></span>
                {complete ? <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">Reviewed</span> : attention.needsAttention ? <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-900 dark:text-amber-200">Needs attention</span> : <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">Not reviewed</span>}
              </button>
              {open ? <div className="border-t border-border px-3 pb-4 pt-3">
                {attention.reasons.length ? <div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-950 dark:text-amber-100"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><div><p className="font-medium">Check this visit closely</p><p className="mt-1 text-xs leading-5">{attention.reasons.join(" ")}</p></div></div> : null}
                {rejected ? <div className="mt-3 rounded-md bg-muted p-3 text-sm"><p className="font-medium">You marked this as not a service visit.</p><button type="button" onClick={() => updateVisitOutcome(index, "unreviewed")} className="mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline">Change answer</button></div> : <>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {review.visitOutcome === "unreviewed" ? <><Button type="button" size="sm" onClick={() => updateVisitOutcome(index, "confirmed")}><CheckCircle2 className="h-4 w-4" aria-hidden /> Visit details match</Button><Button type="button" size="sm" variant="outline" onClick={() => setEditingVisits((current) => new Set(current).add(index))}><Pencil className="h-4 w-4" aria-hidden /> Edit visit details</Button><Button type="button" size="sm" variant="ghost" onClick={() => updateVisitOutcome(index, "not-a-visit")}>Not a service visit</Button><Button type="button" size="sm" variant="ghost" onClick={() => updateVisitOutcome(index, "unsure")}>I’m not sure</Button></> : <><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">Visit {review.visitOutcome === "confirmed" ? "matches report" : review.visitOutcome === "corrected" ? "corrected" : "needs source review"}</span><button type="button" onClick={() => updateVisitOutcome(index, "unreviewed")} className="text-sm font-medium text-primary underline-offset-4 hover:underline">Change answer</button></>}
                  </div>
                  {editingVisits.has(index) ? <div className="mt-3 grid gap-3 rounded-md border border-border bg-muted/30 p-3 sm:grid-cols-2"><label className="text-sm font-medium">Service date<input value={record.serviceDate ?? ""} onChange={(event) => updateVisit(index, { serviceDate: event.target.value || null })} placeholder="YYYY-MM-DD" className="mt-1 h-10 w-full rounded-md border border-input bg-card px-3 text-sm" /></label><label className="text-sm font-medium">Mileage<input inputMode="numeric" value={record.mileage ?? ""} onChange={(event) => { const mileage = Number(event.target.value); updateVisit(index, { mileage: event.target.value === "" || !Number.isFinite(mileage) ? null : mileage }); }} placeholder="Not shown" className="mt-1 h-10 w-full rounded-md border border-input bg-card px-3 text-sm" /></label><label className="text-sm font-medium sm:col-span-2">Shop or provider<input value={record.provider ?? ""} onChange={(event) => updateVisit(index, { provider: event.target.value || null })} placeholder="Not shown" className="mt-1 h-10 w-full rounded-md border border-input bg-card px-3 text-sm" /></label><Button type="button" size="sm" variant="outline" onClick={() => setEditingVisits((current) => { const next = new Set(current); next.delete(index); return next; })}>Done editing visit</Button></div> : null}
                  <details className="mt-3 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground"><summary className="cursor-pointer font-medium text-foreground">Shop details</summary><dl className="mt-2 grid gap-2 sm:grid-cols-3"><div><dt className="font-medium text-foreground">Location</dt><dd className="mt-1 leading-5">{providerLocationCopy(record)}</dd></div><div><dt className="font-medium text-foreground">Record type</dt><dd className="mt-1 leading-5">{recordKindCopy[record.recordKind]}</dd></div><div><dt className="font-medium text-foreground">Reported by</dt><dd className="mt-1 leading-5">{reportedByCopy[record.reportedBy]}</dd></div></dl></details>
                  <div className="mt-4 border-t border-border pt-3"><p className="text-sm font-medium">Service actions</p><p className="mt-1 text-xs text-muted-foreground">Review each action separately. “Not itemized” means the report did not provide enough detail to judge it.</p><div className="mt-3 space-y-2">
                    {review.serviceItems.map((item, itemIndex) => {
                      const itemKey = `${index}:${itemIndex}`;
                      const editingItem = editingServiceItems.has(itemKey);
                      const label = item.finalItem || item.originalItem || "No service item was proposed";
                      return <div key={itemKey} className="rounded-md border border-border bg-card p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{label}</p>{item.outcome !== "unreviewed" ? <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{actionOutcomeCopy[item.outcome]}</span> : null}</div>{editingItem || (item.originalItem === null && item.outcome === "unreviewed") ? <div className="mt-3 flex flex-wrap gap-2"><input value={item.finalItem ?? ""} onChange={(event) => updateServiceItem(index, itemIndex, { finalItem: event.target.value })} placeholder="Service item" className="h-9 min-w-52 flex-1 rounded-md border border-input bg-background px-3 text-sm" /><Button type="button" size="sm" disabled={!item.finalItem?.trim()} onClick={() => { updateServiceItem(index, itemIndex, { outcome: item.originalItem === null ? "added" : "corrected" }); setEditingServiceItems((current) => { const next = new Set(current); next.delete(itemKey); return next; }); }}>{item.originalItem === null ? "Add service item" : "Save correction"}</Button></div> : null}{item.outcome === "unreviewed" && item.originalItem !== null ? <div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" onClick={() => updateServiceItem(index, itemIndex, { outcome: "confirmed" })}><CheckCircle2 className="h-4 w-4" aria-hidden /> Matches report</Button><Button type="button" size="sm" variant="outline" onClick={() => setEditingServiceItems((current) => new Set(current).add(itemKey))}><Pencil className="h-4 w-4" aria-hidden /> Edit</Button><Button type="button" size="sm" variant="ghost" onClick={() => updateServiceItem(index, itemIndex, { finalItem: null, outcome: "not-itemized" })}>Not itemized</Button><Button type="button" size="sm" variant="ghost" onClick={() => updateServiceItem(index, itemIndex, { finalItem: null, outcome: "not-supported" })}>Not in report</Button><Button type="button" size="sm" variant="ghost" onClick={() => updateServiceItem(index, itemIndex, { outcome: "unsure" })}>I’m not sure</Button></div> : null}{item.outcome !== "unreviewed" ? <button type="button" onClick={() => updateServiceItem(index, itemIndex, { finalItem: item.originalItem, outcome: "unreviewed" })} className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline">Change answer</button> : null}</div>;
                    })}
                  </div><Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => addServiceItem(index)}><Plus className="h-4 w-4" aria-hidden /> Add a service item</Button></div>
                </>}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <a href={`/api/research/imports/${run.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"><FileText className="h-4 w-4" aria-hidden /> Open your original PDF</a>
                </div>
                <details className="mt-3 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground"><summary className="cursor-pointer font-medium text-foreground">Why we found this</summary>{record.evidencePages.length ? <p className="mt-2">PDF page{record.evidencePages.length === 1 ? "" : "s"}: {record.evidencePages.join(", ")}</p> : <p className="mt-2">Page not captured</p>}<p className="mt-1 leading-5">{record.evidence || "No matching text was found."}</p></details>
              </div> : null}
            </article>
          );
        })}
      </div>

      <Button type="button" variant="outline" className="mt-4" onClick={() => { const nextIndex = draft.records.length; setDraft((current) => current ? { ...current, records: [...current.records, emptyRecord()] } : current); setFilter("all"); setExpandedRecords((current) => new Set([...current, nextIndex])); }}><Plus className="h-4 w-4" aria-hidden /> Add a missed visit</Button>
      {draft.warnings.length > 0 ? <p className="mt-4 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">{draft.warnings.join(" ")}</p> : null}
      {saveError ? <p className="mt-3 text-sm text-destructive">{saveError}</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-3"><Button type="button" variant="outline" disabled={saving} onClick={() => void save(false)}>{saving ? "Saving…" : "Save progress"}</Button><Button type="button" disabled={saving || !progress.complete} onClick={() => void save(true)}>{saving ? "Saving…" : run.status === "reviewed" ? "Update completed review" : "Finish review"}</Button>{!progress.complete ? <Button type="button" variant="ghost" onClick={reviewNext}><RotateCcw className="h-4 w-4" aria-hidden /> Review next · {progress.totalVisits - progress.reviewedVisits} visits remaining</Button> : <span className="text-sm text-primary">Every visit has a review outcome.</span>}</div>
    </section>
  );
}

export function ResearchDeleteDialog({
  run,
  deleting,
  error,
  onOpenChange,
  onConfirm,
}: {
  run: ResearchImportRun | null;
  deleting: boolean;
  error: PortalError;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={Boolean(run)} onOpenChange={(open) => {
      if (!deleting) onOpenChange(open);
    }}>
      <DialogContent showClose={!deleting} aria-describedby="research-delete-description" className="max-w-md">
        <div className="border-b border-destructive/15 bg-destructive/5 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Trash2 className="h-5 w-5" aria-hidden />
            </span>
            <DialogHeader className="pt-0.5 text-left">
              <DialogTitle>Delete this research PDF?</DialogTitle>
              <p id="research-delete-description" className="pt-1 text-sm leading-6 text-muted-foreground">
                This permanently removes the PDF and its AI-assisted research draft. It will not change your VehicleOS
                maintenance history.
              </p>
            </DialogHeader>
          </div>
        </div>

        <div className="space-y-4 px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-3">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 truncate text-sm font-medium">{run?.fileName}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            This cannot be undone. You can upload the PDF again later if you still have a copy.
          </p>
          {error ? (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/20 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="outline" disabled={deleting} onClick={() => onOpenChange(false)}>
            Keep PDF
          </Button>
          <Button type="button" variant="destructive" disabled={deleting} onClick={onConfirm}>
            {deleting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
            {deleting ? "Deleting PDF…" : "Delete PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
  const [runPendingDeletion, setRunPendingDeletion] = useState<ResearchImportRun | null>(null);
  const [deletingRunId, setDeletingRunId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<PortalError>(null);
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

  const saveReview = async (runId: string, ownerDraft: ResearchImportDraft, reviewComplete: boolean) => {
    const response = await fetch("/api/research/imports/" + runId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerDraft, reviewComplete }),
    });
    const body = (await response.json()) as { run?: ResearchImportRun; error?: string };
    if (!response.ok || !body.run) throw new Error(readableError(body.error ?? ""));
    setRuns((current) => current.map((run) => (run.id === runId ? (body.run as ResearchImportRun) : run)));
  };

  const deleteRun = async () => {
    const runId = runPendingDeletion?.id;
    if (!runId) return;
    setDeletingRunId(runId);
    setError(null);
    setDeleteError(null);
    try {
      const response = await fetch("/api/research/imports/" + runId, { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        const body = (await response.json()) as { error?: string };
        throw new Error(readableError(body.error ?? ""));
      }
      setRuns((current) => current.filter((run) => run.id !== runId));
      setRunPendingDeletion(null);
    } catch (deleteError) {
      setDeleteError(deleteError instanceof Error ? deleteError.message : "Could not delete this research upload.");
    } finally {
      setDeletingRunId(null);
    }
  };

  const closeDeleteDialog = () => {
    if (deletingRunId) return;
    setRunPendingDeletion(null);
    setDeleteError(null);
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
                      <p className="mt-1 text-sm text-muted-foreground">
                        {run.status === "extracted" && run.ownerDraft ? "Review in progress. You can pick up where you left off." : statusCopy[run.status]}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Delete by {new Date(run.deleteAfter).toLocaleDateString()}
                        {run.model ? " · " + run.model : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setRunPendingDeletion(run);
                      }}
                      aria-label={`Delete ${run.fileName}`}
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
      <ResearchDeleteDialog
        run={runPendingDeletion}
        deleting={deletingRunId === runPendingDeletion?.id}
        error={deleteError}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog();
        }}
        onConfirm={() => void deleteRun()}
      />
    </section>
  );
}
