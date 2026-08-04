"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ResearchAdjudicationStatus,
  ResearchAttemptMetrics,
  ResearchComparisonObservation,
  ResearchDeletionAuditEvent,
  ResearchExtractionStrategy,
  ResearchOperatorReport,
  ResearchOperatorRun,
} from "@/lib/research-import/types";

type SafeAttempt = {
  strategy: ResearchExtractionStrategy;
  status: string;
  model: string | null;
  promptVersion: string;
  schemaVersion: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  latencyMs: number | null;
  estimatedCostUsd: number | null;
  errorCode: string | null;
};

type SafeRun = {
  id: string;
  status: string;
  createdAt: string;
  deleteAfter: string;
  assignedStrategy: ResearchExtractionStrategy | null;
  displayedStrategy: ResearchExtractionStrategy | null;
  displayOverrideReason: string | null;
  adjudicationStatus: ResearchAdjudicationStatus;
  adjudicatedAt: string | null;
  attempts: SafeAttempt[];
};

type ReportPayload = {
  report: ResearchOperatorReport;
  runs: SafeRun[];
  observations: ResearchComparisonObservation[];
  deletionEvents: ResearchDeletionAuditEvent[];
};

type DetailPayload = { run: ResearchOperatorRun; pdfUrl: string };

const percent = (value: number | null): string => (value === null ? "—" : `${(value * 100).toFixed(1)}%`);
const number = (value: number | null, digits = 0): string =>
  value === null ? "—" : value.toLocaleString(undefined, { maximumFractionDigits: digits });
const money = (value: number | null): string => (value === null ? "Not configured" : `$${value.toFixed(4)}`);

const metricCells = (metrics: ResearchAttemptMetrics | null) => ({
  corrections: metrics ? number(metrics.correctionChanges, 1) : "—",
  precision: metrics ? percent(metrics.serviceLinePrecision) : "—",
  recall: metrics ? percent(metrics.serviceLineRecall) : "—",
  unsupported: metrics ? number(metrics.unsupportedServiceLines) : "—",
  omitted: metrics ? number(metrics.omittedServiceLines) : "—",
});

export function ResearchOperatorPage() {
  const [payload, setPayload] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadReport = async () => {
    setError(null);
    const response = await fetch("/api/research/admin/report", { cache: "no-store" });
    const body = (await response.json()) as ReportPayload & { error?: string };
    if (!response.ok || !body.report) throw new Error(body.error ?? "Could not load the research report.");
    setPayload(body);
  };

  useEffect(() => {
    loadReport()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Could not load the report."))
      .finally(() => setLoading(false));
  }, []);

  const observationsByRun = useMemo(
    () => new Map((payload?.observations ?? []).filter((item) => item.runId).map((item) => [item.runId, item])),
    [payload?.observations],
  );

  const inspectRun = async (runId: string) => {
    setDetailLoading(runId);
    setError(null);
    try {
      const response = await fetch(`/api/research/admin/runs/${runId}`, { cache: "no-store" });
      const body = (await response.json()) as DetailPayload & { error?: string };
      if (!response.ok || !body.run) throw new Error(body.error ?? "Could not open this research run.");
      setDetail(body);
      setNotes(body.run.adjudicationNotes ?? "");
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : "Could not open this research run.");
    } finally {
      setDetailLoading(null);
    }
  };

  const adjudicate = async (status: Exclude<ResearchAdjudicationStatus, "pending">) => {
    if (!detail || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/research/admin/runs/${detail.run.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      const body = (await response.json()) as { updated?: boolean; error?: string };
      if (!response.ok || !body.updated) throw new Error(body.error ?? "Could not save adjudication.");
      setDetail(null);
      await loadReport();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save adjudication.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <section className="px-1 py-2 text-sm text-muted-foreground">Loading research results…</section>;
  }

  const report = payload?.report;
  return (
    <section>
      <header className="border-b border-border pb-6">
        <div>
          <p className="text-sm font-medium text-primary">VehicleOS research operator</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">CARFAX import evidence</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Review extraction quality, owner corrections, and evidence before changing the import experience.</p>
        </div>
      </header>

      {error ? <p className="mt-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      {!report ? null : (
        <>
          <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Decision support</p>
            <h2 className="mt-2 text-xl font-semibold">{report.decisionState.replaceAll("-", " ")}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{report.decisionReason}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.min(100, (report.reviewedPairedRuns / report.minimumReviewedRuns) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {report.reviewedPairedRuns} of {report.minimumReviewedRuns} source-verified paired reviews collected
              {report.excludedFromDecision ? ` · ${report.excludedFromDecision} awaiting or excluded from adjudication` : ""}. This is guidance, not an automatic production switch.
            </p>
          </section>

          <section className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["Active uploads", report.activeRuns],
              ["Waiting for owner", report.pendingOwnerReviews],
              ["Needs source review", report.pendingAdjudications],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </section>

          <section className="mt-6 rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Retention and deletion health</h2>
            {payload?.deletionEvents.length ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <p className="rounded-md bg-muted p-3 text-sm">
                  Latest: {payload.deletionEvents[0].action.replaceAll("-", " ")} · {payload.deletionEvents[0].outcome} · {new Date(payload.deletionEvents[0].createdAt).toLocaleString()}
                </p>
                <p className="rounded-md bg-muted p-3 text-sm">
                  Recent failures: {payload.deletionEvents.filter((event) => event.outcome !== "succeeded").length}
                </p>
              </div>
            ) : <p className="mt-2 text-sm text-muted-foreground">No deletion events recorded yet.</p>}
          </section>

          <section className="mt-6 overflow-x-auto rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Strategy comparison</h2>
            <table className="mt-4 w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr><th className="pb-2">Signal</th><th className="pb-2">Text-first</th><th className="pb-2">Direct PDF</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["Usable drafts", `${report.baseline.usableDrafts} / ${report.baseline.attempted}`, `${report.challenger.usableDrafts} / ${report.challenger.attempted}`],
                  ["Usable-draft rate", percent(report.baseline.usableDraftRate), percent(report.challenger.usableDraftRate)],
                  ["Schema-valid responses", `${report.baseline.schemaValidResponses} / ${report.baseline.schemaValidityObserved}`, `${report.challenger.schemaValidResponses} / ${report.challenger.schemaValidityObserved}`],
                  ["Schema-valid rate", percent(report.baseline.schemaValidRate), percent(report.challenger.schemaValidRate)],
                  ["Attempt failure rate", percent(report.baseline.failureRate), percent(report.challenger.failureRate)],
                  ["Avg correction changes", number(report.baseline.averageCorrectionChanges, 1), number(report.challenger.averageCorrectionChanges, 1)],
                  ["Service-line precision", percent(report.baseline.averageServiceLinePrecision), percent(report.challenger.averageServiceLinePrecision)],
                  ["Service-line recall", percent(report.baseline.averageServiceLineRecall), percent(report.challenger.averageServiceLineRecall)],
                  ["Owner-rejected lines", number(report.baseline.unsupportedServiceLines), number(report.challenger.unsupportedServiceLines)],
                  ["Omitted lines", number(report.baseline.omittedServiceLines), number(report.challenger.omittedServiceLines)],
                  ["p50 latency", report.baseline.p50LatencyMs === null ? "—" : `${number(report.baseline.p50LatencyMs)} ms`, report.challenger.p50LatencyMs === null ? "—" : `${number(report.challenger.p50LatencyMs)} ms`],
                  ["p95 latency", report.baseline.p95LatencyMs === null ? "—" : `${number(report.baseline.p95LatencyMs)} ms`, report.challenger.p95LatencyMs === null ? "—" : `${number(report.challenger.p95LatencyMs)} ms`],
                  ["Avg tokens", number(report.baseline.averageTotalTokens), number(report.challenger.averageTotalTokens)],
                  ["Avg estimated cost", money(report.baseline.averageEstimatedCostUsd), money(report.challenger.averageEstimatedCostUsd)],
                  ["p50 estimated cost", money(report.baseline.p50EstimatedCostUsd), money(report.challenger.p50EstimatedCostUsd)],
                  ["p95 estimated cost", money(report.baseline.p95EstimatedCostUsd), money(report.challenger.p95EstimatedCostUsd)],
                ].map(([label, baseline, challenger]) => (
                  <tr key={String(label)}><th className="py-2 font-medium">{label}</th><td className="py-2">{baseline}</td><td className="py-2">{challenger}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Latency is measured around each model request. Cost is an estimate from returned token usage and the configured model rates; account billing is reconciled separately and never uses a browser key.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold">Run queue</h2>
            <p className="mt-1 text-sm text-muted-foreground">Routine rows contain no filename, VIN, raw PDF, or full model output.</p>
            <div className="mt-3 space-y-3">
              {(payload?.runs ?? []).map((run) => {
                const observation = observationsByRun.get(run.id);
                const baselineMetrics = metricCells(observation?.baselineMetrics ?? null);
                const challengerMetrics = metricCells(observation?.challengerMetrics ?? null);
                return (
                  <article key={run.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">{run.id.slice(0, 8)}</p>
                        <p className="mt-1 text-sm font-medium">{run.status} · shown {run.displayedStrategy ?? "none"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(run.createdAt).toLocaleString()} · adjudication {run.adjudicationStatus}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void inspectRun(run.id)}
                        disabled={detailLoading === run.id}
                        className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                      >
                        {detailLoading === run.id ? "Opening…" : "Inspect source"}
                      </button>
                    </div>
                    {observation ? (
                      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                        <p className="rounded-md bg-muted p-2">Text-first: {baselineMetrics.corrections} changes · {baselineMetrics.unsupported} rejected · {baselineMetrics.omitted} omitted</p>
                        <p className="rounded-md bg-muted p-2">Direct PDF: {challengerMetrics.corrections} changes · {challengerMetrics.unsupported} rejected · {challengerMetrics.omitted} omitted</p>
                      </div>
                    ) : <p className="mt-3 text-xs text-muted-foreground">Waiting for the owner correction.</p>}
                    {run.attempts.some((attempt) => attempt.errorCode) ? (
                      <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-muted-foreground">
                        {run.attempts.filter((attempt) => attempt.errorCode).map((attempt) => (
                          <p key={attempt.strategy}>{attempt.strategy}: {attempt.errorCode}</p>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}

      {detail ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 sm:p-8">
          <section className="mx-auto max-w-5xl rounded-xl bg-background p-5 shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-destructive">Sensitive source review</p>
                <h2 className="mt-1 text-xl font-semibold">Adjudicate run {detail.run.id.slice(0, 8)}</h2>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="text-sm font-medium">Close</button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Opening the private PDF is audited. Its link expires in five minutes.
            </p>
            <a href={detail.pdfUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
              Open private PDF
            </a>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {detail.run.attempts.map((attempt) => (
                <div key={attempt.strategy} className="min-w-0 rounded-lg border border-border p-3">
                  <h3 className="text-sm font-semibold">{attempt.strategy}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {attempt.status}{attempt.errorCode ? ` · ${attempt.errorCode}` : ""}{attempt.providerRequestId ? ` · request ${attempt.providerRequestId}` : ""}
                  </p>
                  <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">{JSON.stringify(attempt.draft, null, 2)}</pre>
                </div>
              ))}
              <div className="min-w-0 rounded-lg border border-primary p-3">
                <h3 className="text-sm font-semibold">Owner correction</h3>
                <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">{JSON.stringify(detail.run.ownerDraft, null, 2)}</pre>
              </div>
            </div>
            <label className="mt-5 block text-sm font-medium">
              Decision note (do not copy personal data)
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={2000} className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm" />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={saving} onClick={() => void adjudicate("confirmed")} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Source confirms correction</button>
              <button type="button" disabled={saving} onClick={() => void adjudicate("corrected")} className="rounded-md border border-border px-3 py-2 text-sm font-medium disabled:opacity-50">Owner label needs correction — exclude</button>
              <button type="button" disabled={saving} onClick={() => void adjudicate("not-required")} className="rounded-md border border-border px-3 py-2 text-sm font-medium disabled:opacity-50">No source review needed</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
