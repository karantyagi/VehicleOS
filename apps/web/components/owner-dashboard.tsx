"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { PanelCard } from "@/components/panel-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { APP_SECTIONS, useAppUiStore } from "@/lib/store/app-ui-store";
import { notify, notifyAuto } from "@/lib/notify";
import { toast } from "sonner";
import { getApiBase } from "../lib/api-base";
import { OnboardingWizard, type OnboardingVehicle } from "./onboarding-wizard";
import { ReceiptCapture, type UploadedReceipt } from "./receipt-capture";
import { QuoteAnalysisPanel, type QuoteAnalysisView } from "./quote-analysis-panel";
import { EvidenceVaultConsole } from "./evidence-vault-console";
import type { EvidenceVaultItem } from "./evidence-vault-panel";
import { ResaleReportExport } from "./resale-report-export";
import { VoiceMemoryPanel } from "./voice-memory-panel";
import { SeasonalPromptsPanel } from "./seasonal-prompts-panel";
import { ManualKnowledgePanel } from "./manual-knowledge-panel";
import { MaintenanceTimelineConsole } from "./maintenance-timeline-console";
import { NowQueueConsole } from "./now-queue-console";
import { OwnerServiceNotePanel } from "./owner-service-note-panel";
import { openEvidenceDocument } from "../lib/evidence-access";
import { useVehicleConsole } from "@/lib/vehicle-console-context";
import type { PipelinePhase, QueueItem, TimelineEntry } from "@/lib/console-types";

type Vehicle = OnboardingVehicle;

const receiptForm = {
  shop: "Jiffy Lube",
  serviceDate: "2026-01-12",
  mileage: 41_800,
  lineItems: "Oil change (synthetic)\nFilter replaced",
  total: "$67.42",
};

export function OwnerDashboard() {
  const apiBase = getApiBase();
  const { setSnapshot } = useVehicleConsole();
  const activeSection = useAppUiStore((state) => state.activeSection);
  const sectionMeta = APP_SECTIONS.find((section) => section.id === activeSection) ?? APP_SECTIONS[0];
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [nowQueue, setNowQueue] = useState<QueueItem[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(receiptForm);
  const [uploadedReceipt, setUploadedReceipt] = useState<UploadedReceipt | null>(null);
  const [captureError, setCaptureError] = useState("");
  const [quoteAnalyses, setQuoteAnalyses] = useState<QuoteAnalysisView[]>([]);
  const [evidenceVault, setEvidenceVault] = useState<EvidenceVaultItem[]>([]);
  const [isRefreshingNow, setIsRefreshingNow] = useState(false);
  const [knowledgeSchedule, setKnowledgeSchedule] = useState<
    { serviceName: string; intervalMiles?: number; manualTitle: string }[]
  >([]);
  const [pipelinePhase, setPipelinePhase] = useState<PipelinePhase>("idle");

  const feedback = useCallback((message: string) => {
    notifyAuto(message);
  }, []);

  const vehicleLabel = useMemo(() => {
    if (!vehicle) return null;
    return `${vehicle.year} ${vehicle.make} ${vehicle.model} · ${vehicle.currentMileage.toLocaleString()} mi`;
  }, [vehicle]);

  useEffect(() => {
    if (!vehicle) {
      setSnapshot(null);
      return;
    }

    const last =
      timeline.length > 0
        ? [...timeline].sort((a, b) => b.serviceDate.localeCompare(a.serviceDate))[0]
        : undefined;
    const pendingNowCount = nowQueue.filter((item) => item.status === "pending").length;
    const pipelineLabel =
      pipelinePhase === "extracting"
        ? "Extracting manual…"
        : pipelinePhase === "syncing" || isBusy
          ? "Syncing vehicle state…"
          : "Pipeline idle";

    setSnapshot({
      label: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      mileage: vehicle.currentMileage,
      pendingNowCount,
      lastServiceDate: last?.serviceDate ?? null,
      lastServiceShop: last?.shop ?? null,
      pipelinePhase: isBusy || pipelinePhase !== "idle" ? (pipelinePhase === "idle" ? "syncing" : pipelinePhase) : "idle",
      pipelineLabel,
    });
  }, [vehicle, timeline, nowQueue, isBusy, pipelinePhase, setSnapshot]);

  useEffect(() => {
    return () => setSnapshot(null);
  }, [setSnapshot]);

  const loadVehicleState = useCallback(
    async (nextVehicle: Vehicle) => {
      const response = await fetch(`${apiBase}/api/vehicles/${nextVehicle.id}/state`);
      if (!response.ok) return;

      const body = (await response.json()) as {
        timeline: TimelineEntry[];
        nowQueue: QueueItem[];
        quoteAnalyses?: QuoteAnalysisView[];
        evidenceVault?: EvidenceVaultItem[];
        knowledgeSchedule?: { serviceName: string; intervalMiles?: number; manualTitle: string }[];
        currentMileage?: number;
      };

      setTimeline(body.timeline);
      setNowQueue(body.nowQueue);
      setQuoteAnalyses(body.quoteAnalyses ?? []);
      setEvidenceVault(body.evidenceVault ?? []);
      setKnowledgeSchedule(body.knowledgeSchedule ?? []);
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
          feedback("Could not load your garage. Refresh to try again.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [apiBase, loadVehicleState, feedback]);

  const handleOnboardingComplete = async (created: OnboardingVehicle) => {
    setVehicle(created);
    setForm((current) => ({ ...current, mileage: created.currentMileage }));
    feedback("Vehicle saved. Upload a receipt below to run the golden path.");
    await loadVehicleState(created);
  };

  const submitReceipt = async () => {
    if (!vehicle) return;
    if (!uploadedReceipt) {
      feedback("Upload a receipt photo or PDF first.");
      return;
    }
    setIsBusy(true);
    const loadingToast = toast.loading("Recording service and generating recommendation…");
    setPipelinePhase("syncing");
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
      feedback(
        body.conflict
          ? "Conflict detected — review the verification task in your Now queue."
          : "Golden path complete — review the Now queue.",
      );
      setUploadedReceipt(null);
      setCaptureError("");
    } catch {
      feedback("Receipt submission failed.");
    } finally {
      toast.dismiss(loadingToast);
      setIsBusy(false);
      setPipelinePhase("idle");
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
      feedback(`Task ${decision}d.`);
    } finally {
      setIsBusy(false);
    }
  };

  const refreshNowQueue = async () => {
    if (!vehicle) return;
    setIsRefreshingNow(true);
    try {
      const response = await fetch(`${apiBase}/api/vehicles/${vehicle.id}/now/refresh`, {
        method: "POST",
      });
      const body = (await response.json()) as {
        created: boolean;
        nowQueue: QueueItem[];
        recommendation?: { title: string };
        skippedReason?: string;
        error?: string;
      };
      if (!response.ok) {
        feedback(body.error ?? "Could not refresh recommendations.");
        return;
      }
      setNowQueue(body.nowQueue);
      if (body.created && body.recommendation) {
        feedback(`Added to Now queue: ${body.recommendation.title}`);
      } else if (body.skippedReason === "already_pending") {
        feedback("A matching recommendation is already in your Now queue.");
      } else {
        feedback("No new maintenance actions due right now.");
      }
    } finally {
      setIsRefreshingNow(false);
    }
  };

  const openEvidence = (documentId: string) => {
    if (!vehicle) return;
    void openEvidenceDocument({ apiBase, vehicleId: vehicle.id, documentId }).then((result) => {
      if (!result.ok) feedback(result.error);
    });
  };

  const pendingCount = nowQueue.filter((item) => item.status === "pending").length;

  const headerAction =
    activeSection === "now" ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isBusy || isRefreshingNow}
        onClick={() => void refreshNowQueue()}
      >
        {isRefreshingNow ? "Refreshing…" : "Refresh recommendations"}
      </Button>
    ) : activeSection === "receipts" ? (
      <Button type="button" size="sm" disabled={isBusy || !uploadedReceipt} onClick={() => void submitReceipt()}>
        Confirm receipt
      </Button>
    ) : null;

  useEffect(() => {
    document.title = `${sectionMeta.label} · VehicleOS`;
  }, [sectionMeta.label]);

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading garage">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
        <PanelCard title="Loading" description="Opening your garage…">
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </PanelCard>
      </div>
    );
  }

  if (!vehicle) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  return (
    <>
      <PageHeader
        eyebrow="Owners · Early access"
        title={sectionMeta.label}
        description={sectionMeta.description}
        badge={
          <>
            {vehicleLabel ? (
              <Badge variant="secondary" className="tabular-nums font-normal">
                {vehicleLabel}
              </Badge>
            ) : null}
            {activeSection === "now" && pendingCount > 0 ? (
              <Badge className="tabular-nums">{pendingCount} pending</Badge>
            ) : null}
          </>
        }
        action={headerAction}
      />

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Viewing {sectionMeta.label} section
      </p>

      {activeSection === "now" ? (
        <PanelCard title="Inbox" description="Filter, inspect lineage, decide — nothing changes until you confirm.">
          <NowQueueConsole items={nowQueue} disabled={isBusy} onDecide={decide} />
        </PanelCard>
      ) : null}

      {activeSection === "timeline" ? (
        <PanelCard title="Maintenance timeline" description="Operator table with detail inspection — select a row.">
          <MaintenanceTimelineConsole
            entries={timeline}
            disabled={isBusy}
            onOpenEvidence={openEvidence}
          />
        </PanelCard>
      ) : null}

      {activeSection === "receipts" ? (
        <PanelCard
          title="Receipt capture"
          description="Upload, confirm details, and run the service loop."
          variant="inset"
        >
          <ReceiptCapture
            vehicleId={vehicle.id}
            apiBase={apiBase}
            disabled={isBusy}
            onUploaded={setUploadedReceipt}
            onError={(message) => {
              setCaptureError(message);
              notify(message, "error");
            }}
          />
          {captureError ? <p className="text-sm text-destructive">{captureError}</p> : null}
          <div className="surface-panel space-y-4 p-4">
            <p className="text-[13px] font-medium text-foreground">Service details</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
              <Label htmlFor="receipt-shop">Shop</Label>
              <Input
                id="receipt-shop"
                value={form.shop}
                onChange={(event) => setForm({ ...form, shop: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt-date">Service date</Label>
              <Input
                id="receipt-date"
                value={form.serviceDate}
                onChange={(event) => setForm({ ...form, serviceDate: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt-mileage">Mileage</Label>
              <Input
                id="receipt-mileage"
                type="number"
                className="tabular-nums"
                value={form.mileage}
                onChange={(event) => setForm({ ...form, mileage: Number(event.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt-total">Total</Label>
              <Input
                id="receipt-total"
                value={form.total}
                onChange={(event) => setForm({ ...form, total: event.target.value })}
              />
            </div>
            </div>
            <div className="space-y-2">
            <Label htmlFor="receipt-lines">Line items</Label>
            <Textarea
              id="receipt-lines"
              value={form.lineItems}
              onChange={(event) => setForm({ ...form, lineItems: event.target.value })}
              rows={3}
            />
          </div>
            <p className="text-xs text-muted-foreground lg:hidden">
              Use <strong className="font-medium text-foreground">Confirm receipt</strong> in the page header when ready.
            </p>
          </div>
        </PanelCard>
      ) : null}

      {activeSection === "evidence" ? (
        <>
          <PanelCard title="Evidence vault" description="Immutable artifacts — table and inspection panel.">
            <EvidenceVaultConsole
              vehicleId={vehicle.id}
              apiBase={apiBase}
              items={evidenceVault}
              linkedDocumentIds={timeline.flatMap((entry) => entry.evidenceIds)}
            />
          </PanelCard>
          <PanelCard title="Resale export" description="Download a markdown report for buyers.">
            <ResaleReportExport
              vehicleId={vehicle.id}
              apiBase={apiBase}
              disabled={isBusy}
              serviceCount={timeline.length}
              evidenceCount={evidenceVault.length}
              onError={(message) => notify(message, "error")}
            />
          </PanelCard>
        </>
      ) : null}

      {activeSection === "more" ? (
        <div className="space-y-6">
          <PanelCard title="Voice memory" description="Capture service notes by voice.">
            <VoiceMemoryPanel
              vehicleId={vehicle.id}
              apiBase={apiBase}
              defaultMileage={vehicle.currentMileage}
              disabled={isBusy}
              onError={(message) => notify(message, "error")}
              onSubmitted={(body) => {
                setTimeline(body.timeline as TimelineEntry[]);
                setNowQueue(body.nowQueue as QueueItem[]);
                feedback(
                  body.conflict
                    ? "Conflict detected — review the verification task in your Now queue."
                    : "Voice note saved — review the Now queue.",
                );
                void loadVehicleState(vehicle);
              }}
            />
          </PanelCard>

          <PanelCard title="Seasonal prompts" description="Weather and season-aware maintenance nudges.">
            <SeasonalPromptsPanel
              vehicleId={vehicle.id}
              apiBase={apiBase}
              disabled={isBusy}
              onError={(message) => notify(message, "error")}
              onRefreshed={(body) => {
                setNowQueue(body.nowQueue as QueueItem[]);
                if (body.created.length > 0) {
                  feedback(`${body.created.length} seasonal prompt(s) added to your Now queue.`);
                }
              }}
            />
          </PanelCard>

          <PanelCard title="OEM manual" description="Extract maintenance intervals from your manual.">
            <ManualKnowledgePanel
              vehicleId={vehicle.id}
              apiBase={apiBase}
              vehicle={{ year: vehicle.year, make: vehicle.make, model: vehicle.model }}
              disabled={isBusy}
              onError={(message) => notify(message, "error")}
              onConfirmed={(body) => {
                setNowQueue(body.nowQueue as QueueItem[]);
                setKnowledgeSchedule(
                  body.knowledgeSchedule as {
                    serviceName: string;
                    intervalMiles?: number;
                    manualTitle: string;
                  }[],
                );
                feedback("OEM schedule saved — knowledge base now feeds your Now queue.");
                void loadVehicleState(vehicle);
              }}
            />
            {knowledgeSchedule.length > 0 ? (
              <ul className="knowledge-list mt-4 space-y-2 text-sm">
                {knowledgeSchedule.slice(-4).map((entry) => (
                  <li key={`${entry.manualTitle}-${entry.serviceName}`} className="rounded-md border border-border p-3">
                    <strong>{entry.serviceName}</strong>
                    {entry.intervalMiles ? ` · every ${entry.intervalMiles.toLocaleString()} mi` : ""}
                    <span className="mt-1 block text-muted-foreground">{entry.manualTitle}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </PanelCard>

          <PanelCard title="Owner note" description="Add a structured service note to your timeline.">
            <OwnerServiceNotePanel
              vehicleId={vehicle.id}
              apiBase={apiBase}
              defaultMileage={vehicle.currentMileage}
              disabled={isBusy}
              onError={(message) => notify(message, "error")}
              onSubmitted={(body) => {
                setTimeline(body.timeline as TimelineEntry[]);
                setNowQueue(body.nowQueue as QueueItem[]);
                feedback(
                  body.conflict
                    ? "Conflict detected — review the verification task in your Now queue."
                    : "Owner note saved to your timeline.",
                );
                void loadVehicleState(vehicle);
              }}
            />
          </PanelCard>

          <PanelCard title="Quote check" description="Compare dealer quotes against your history.">
            <QuoteAnalysisPanel
              vehicleId={vehicle.id}
              apiBase={apiBase}
              disabled={isBusy}
              history={quoteAnalyses}
              onAnalyzed={(analysis) => setQuoteAnalyses((current) => [...current, analysis].slice(-5))}
            />
          </PanelCard>
        </div>
      ) : null}
    </>
  );
}
