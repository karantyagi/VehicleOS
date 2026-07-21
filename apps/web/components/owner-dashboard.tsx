"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiBase } from "../lib/api-base";
import { OnboardingWizard, type OnboardingVehicle } from "./onboarding-wizard";
import { ReceiptCapture, type UploadedReceipt } from "./receipt-capture";
import { QuoteAnalysisPanel, type QuoteAnalysisView } from "./quote-analysis-panel";
import { EvidenceVaultPanel, type EvidenceVaultItem } from "./evidence-vault-panel";
import { ResaleReportExport } from "./resale-report-export";
import { VoiceMemoryPanel } from "./voice-memory-panel";
import { openEvidenceDocument } from "../lib/evidence-access";

type Vehicle = OnboardingVehicle;

type TimelineEntry = {
  serviceId: string;
  shop: string;
  serviceDate: string;
  mileage: number;
  lineItems: string[];
  total: string;
  evidenceIds: string[];
};

type QueueItem = {
  taskId: string;
  title: string;
  reason: string;
  status: string;
  taskKind?: "recommendation" | "verification";
};

const receiptForm = {
  shop: "Jiffy Lube",
  serviceDate: "2026-01-12",
  mileage: 41_800,
  lineItems: "Oil change (synthetic)\nFilter replaced",
  total: "$67.42",
};

export function OwnerDashboard() {
  const apiBase = getApiBase();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [nowQueue, setNowQueue] = useState<QueueItem[]>([]);
  const [status, setStatus] = useState<string>("");
  const [isBusy, setIsBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(receiptForm);
  const [uploadedReceipt, setUploadedReceipt] = useState<UploadedReceipt | null>(null);
  const [captureError, setCaptureError] = useState("");
  const [quoteAnalyses, setQuoteAnalyses] = useState<QuoteAnalysisView[]>([]);
  const [evidenceVault, setEvidenceVault] = useState<EvidenceVaultItem[]>([]);

  const vehicleLabel = useMemo(() => {
    if (!vehicle) return null;
    return `${vehicle.year} ${vehicle.make} ${vehicle.model} · ${vehicle.currentMileage.toLocaleString()} mi`;
  }, [vehicle]);

  const loadVehicleState = useCallback(
    async (nextVehicle: Vehicle) => {
      const response = await fetch(`${apiBase}/api/vehicles/${nextVehicle.id}/state`);
      if (!response.ok) return;

      const body = (await response.json()) as {
        timeline: TimelineEntry[];
        nowQueue: QueueItem[];
        quoteAnalyses?: QuoteAnalysisView[];
        evidenceVault?: EvidenceVaultItem[];
        currentMileage?: number;
      };

      setTimeline(body.timeline);
      setNowQueue(body.nowQueue);
      setQuoteAnalyses(body.quoteAnalyses ?? []);
      setEvidenceVault(body.evidenceVault ?? []);
      if (body.currentMileage && body.currentMileage > nextVehicle.currentMileage) {
        setVehicle({ ...nextVehicle, currentMileage: body.currentMileage });
      }
      setForm((current) => ({ ...current, mileage: body.currentMileage ?? nextVehicle.currentMileage }));
    },
    [apiBase],
  );

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const response = await fetch(`${apiBase}/api/vehicles`);
        if (!response.ok) throw new Error("list failed");

        const body = (await response.json()) as { vehicles: Vehicle[] };
        const existing = body.vehicles[0];
        if (!existing) {
          if (isMounted) setIsLoading(false);
          return;
        }

        if (isMounted) {
          setVehicle(existing);
          setForm((current) => ({ ...current, mileage: existing.currentMileage }));
          await loadVehicleState(existing);
        }
      } catch {
        if (isMounted) {
          setStatus("Could not load your garage. Refresh to try again.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [apiBase, loadVehicleState]);

  const handleOnboardingComplete = async (created: OnboardingVehicle) => {
    setVehicle(created);
    setForm((current) => ({ ...current, mileage: created.currentMileage }));
    setStatus("Vehicle saved. Upload a receipt below to run the golden path.");
    await loadVehicleState(created);
  };

  const submitReceipt = async () => {
    if (!vehicle) return;
    if (!uploadedReceipt) {
      setStatus("Upload a receipt photo or PDF first.");
      return;
    }
    setIsBusy(true);
    setStatus("Recording service and generating recommendation…");
    try {
      const response = await fetch(`${apiBase}/api/vehicles/${vehicle.id}/receipts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop: form.shop,
          serviceDate: form.serviceDate,
          mileage: Number(form.mileage),
          lineItems: form.lineItems.split("\n").map((line) => line.trim()).filter(Boolean),
          total: form.total,
          storageKey: uploadedReceipt.storageKey,
          channel: uploadedReceipt.channel,
        }),
      });
      const body = (await response.json()) as {
        timeline: TimelineEntry[];
        nowQueue: QueueItem[];
        conflict?: boolean;
        error?: string;
      };
      if (!response.ok && response.status !== 409) throw new Error(body.error ?? "receipt failed");
      setTimeline(body.timeline);
      setNowQueue(body.nowQueue);
      setStatus(
        body.conflict
          ? "Conflict detected — review the verification task in your Now queue."
          : "Golden path complete — review the Now queue.",
      );
      setUploadedReceipt(null);
      setCaptureError("");
    } catch {
      setStatus("Receipt submission failed.");
    } finally {
      setIsBusy(false);
    }
  };

  const decide = async (taskId: string, decision: "approve" | "dismiss" | "snooze") => {
    if (!vehicle) return;
    setIsBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/tasks/${taskId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: vehicle.id, decision }),
      });
      if (!response.ok) throw new Error("decide failed");
      const body = (await response.json()) as { nowQueue: QueueItem[] };
      setNowQueue(body.nowQueue);
      setStatus(`Task ${decision}d.`);
    } finally {
      setIsBusy(false);
    }
  };

  if (isLoading) {
    return (
      <section className="onboarding-panel">
        <p className="eyebrow">Loading</p>
        <h1>Opening your garage…</h1>
      </section>
    );
  }

  if (!vehicle) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Owners · Early access</p>
        <h1>Receipt → recommendation → approve</h1>
        <p>{status || "Upload a receipt, confirm fields, then approve the recommended task."}</p>
      </section>

      <section className="vehicle-summary panel">
        <h2>Your vehicle</h2>
        <p>{vehicleLabel}</p>
      </section>

      <section className="golden-grid">
        <article className="panel">
          <h2>Voice memory</h2>
          <VoiceMemoryPanel
            vehicleId={vehicle.id}
            apiBase={apiBase}
            defaultMileage={vehicle.currentMileage}
            disabled={isBusy}
            onError={(message) => setStatus(message)}
            onSubmitted={(body) => {
              setTimeline(body.timeline as TimelineEntry[]);
              setNowQueue(body.nowQueue as QueueItem[]);
              setStatus(
                body.conflict
                  ? "Conflict detected — review the verification task in your Now queue."
                  : "Voice note saved — review the Now queue.",
              );
              void loadVehicleState(vehicle);
            }}
          />
        </article>

        <article className="panel">
          <h2>1 · Receipt</h2>
          <ReceiptCapture
            vehicleId={vehicle.id}
            apiBase={apiBase}
            disabled={isBusy}
            onUploaded={setUploadedReceipt}
            onError={setCaptureError}
          />
          {captureError ? <p className="settings-error">{captureError}</p> : null}
          <label>
            Shop
            <input
              value={form.shop}
              onChange={(event) => setForm({ ...form, shop: event.target.value })}
            />
          </label>
          <label>
            Service date
            <input
              value={form.serviceDate}
              onChange={(event) => setForm({ ...form, serviceDate: event.target.value })}
            />
          </label>
          <label>
            Mileage
            <input
              type="number"
              value={form.mileage}
              onChange={(event) => setForm({ ...form, mileage: Number(event.target.value) })}
            />
          </label>
          <label>
            Line items
            <textarea
              value={form.lineItems}
              onChange={(event) => setForm({ ...form, lineItems: event.target.value })}
              rows={3}
            />
          </label>
          <label>
            Total
            <input
              value={form.total}
              onChange={(event) => setForm({ ...form, total: event.target.value })}
            />
          </label>
          <button type="button" disabled={isBusy || !uploadedReceipt} onClick={submitReceipt}>
            Confirm receipt → run loop
          </button>
        </article>

        <article className="panel">
          <h2>Quote check</h2>
          <QuoteAnalysisPanel
            vehicleId={vehicle.id}
            apiBase={apiBase}
            disabled={isBusy}
            history={quoteAnalyses}
            onAnalyzed={(analysis) => setQuoteAnalyses((current) => [...current, analysis].slice(-5))}
          />
        </article>

        <article className="panel">
          <h2>Evidence vault</h2>
          <p className="muted">Immutable receipt artifacts linked to your vehicle history.</p>
          <EvidenceVaultPanel
            vehicleId={vehicle.id}
            apiBase={apiBase}
            items={evidenceVault}
            linkedDocumentIds={timeline.flatMap((entry) => entry.evidenceIds)}
          />
        </article>

        <article className="panel">
          <h2>Resale export</h2>
          <ResaleReportExport
            vehicleId={vehicle.id}
            apiBase={apiBase}
            disabled={isBusy}
            serviceCount={timeline.length}
            evidenceCount={evidenceVault.length}
            onError={(message) => setStatus(message)}
          />
        </article>

        <article className="panel">
          <h2>2 · Timeline</h2>
          {timeline.length === 0 ? (
            <p className="muted">No services recorded yet.</p>
          ) : (
            <ul className="timeline-list">
              {timeline.map((entry) => (
                <li key={entry.serviceId}>
                  <strong>{entry.serviceDate}</strong> · {entry.mileage.toLocaleString()} mi · {entry.shop}
                  <span>{entry.lineItems.join(", ")}</span>
                  {entry.evidenceIds.length > 0 ? (
                    <div className="timeline-evidence">
                      {entry.evidenceIds.map((documentId) => (
                        <button
                          key={documentId}
                          type="button"
                          className="link-button"
                          disabled={isBusy}
                          onClick={() =>
                            void openEvidenceDocument({ apiBase, vehicleId: vehicle.id, documentId }).then(
                              (result) => {
                                if (!result.ok) setStatus(result.error);
                              },
                            )
                          }
                        >
                          View receipt evidence
                        </button>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel">
          <h2>3 · Now queue</h2>
          {nowQueue.length === 0 ? (
            <p className="muted">No tasks yet.</p>
          ) : (
            <ul className="queue-list">
              {nowQueue.map((item) => (
                <li key={item.taskId} className={item.taskKind === "verification" ? "queue-verification" : undefined}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.reason}</p>
                    <span className={`badge ${item.taskKind === "verification" ? "badge-warning" : ""}`}>
                      {item.status}
                    </span>
                  </div>
                  {item.status === "pending" ? (
                    <div className="actions">
                      <button type="button" disabled={isBusy} onClick={() => decide(item.taskId, "approve")}>
                        {item.taskKind === "verification" ? "Mark resolved" : "Approve"}
                      </button>
                      <button type="button" disabled={isBusy} onClick={() => decide(item.taskId, "dismiss")}>
                        Dismiss
                      </button>
                      {item.taskKind !== "verification" ? (
                        <button type="button" disabled={isBusy} onClick={() => decide(item.taskId, "snooze")}>
                          Snooze
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </>
  );
}
