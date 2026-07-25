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
import { isOwnerSetupComplete } from "@/lib/setup-completion";
import { OnboardingWizard, type OnboardingVehicle } from "./onboarding-wizard";
import { SetupDriverGate } from "./setup-driver-gate";
import { ReceiptCapture, type UploadedReceipt } from "./receipt-capture";
import { ExtractionStatusBanner } from "@/components/extraction-status-banner";
import { QuoteAnalysisPanel, type QuoteAnalysisView } from "./quote-analysis-panel";
import { EvidenceVaultConsole } from "./evidence-vault-console";
import type { EvidenceVaultItem } from "./evidence-vault-panel";
import { VoiceMemoryPanel } from "./voice-memory-panel";
import { SeasonalPromptsPanel } from "./seasonal-prompts-panel";
import { ManualKnowledgePanel } from "./manual-knowledge-panel";
import { MaintenanceTimelineSection } from "./maintenance-timeline-section";
import { NowQueueConsole } from "./now-queue-console";
import { RemindersConsole } from "./reminders-console";
import { useReminderNotifications } from "@/lib/use-reminder-notifications";
import { OwnerReceiptHandoff } from "./owner-receipt-handoff";
import { OwnerServiceNotePanel } from "./owner-service-note-panel";
import { openEvidenceDocument } from "../lib/evidence-access";
import { useVehicleConsole } from "@/lib/vehicle-console-context";
import { RecordImportPanel } from "./record-import-panel";
import { DateField } from "@/components/date-field";
import { todayIsoDate } from "@/lib/date-input";
import { ImportHistoryNudge } from "./import-history-nudge";
import { VerificationMaturityPanel } from "./verification-maturity-panel";
import type {
  MaintenanceScheduleView,
  OwnershipRecordEntry,
  PipelinePhase,
  OwnerReminderItem,
  QueueItem,
  ServiceHistoryTab,
  TimelineEntry,
  VerificationMaturityView,
} from "@/lib/console-types";

type Vehicle = OnboardingVehicle;

const emptyReceiptForm = {
  shop: "",
  serviceDate: "",
  mileage: 0,
  lineItems: "",
  total: "",
};

export function OwnerDashboard() {
  const apiBase = getApiBase();
  const { setSnapshot } = useVehicleConsole();
  const activeSection = useAppUiStore((state) => state.activeSection);
  const consoleMode = useAppUiStore((state) => state.consoleMode);
  const setActiveSection = useAppUiStore((state) => state.setActiveSection);
  const isDeveloper = consoleMode === "developer";
  const sectionMeta = APP_SECTIONS.find((section) => section.id === activeSection) ?? APP_SECTIONS[0];
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [ownershipRecords, setOwnershipRecords] = useState<OwnershipRecordEntry[]>([]);
  const [serviceHistoryTab, setServiceHistoryTab] = useState<ServiceHistoryTab>("history");
  const [nowQueue, setNowQueue] = useState<QueueItem[]>([]);
  const [reminders, setReminders] = useState<OwnerReminderItem[]>([]);
  const [verifications, setVerifications] = useState<QueueItem[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(emptyReceiptForm);
  const [uploadedReceipt, setUploadedReceipt] = useState<UploadedReceipt | null>(null);
  const [receiptNeedsManualEntry, setReceiptNeedsManualEntry] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const [quoteAnalyses, setQuoteAnalyses] = useState<QuoteAnalysisView[]>([]);
  const [evidenceVault, setEvidenceVault] = useState<EvidenceVaultItem[]>([]);
  const [isRefreshingNow, setIsRefreshingNow] = useState(false);
  const [knowledgeSchedule, setKnowledgeSchedule] = useState<
    { serviceName: string; intervalMiles?: number; manualTitle: string }[]
  >([]);
  const [maintenanceSchedule, setMaintenanceSchedule] = useState<MaintenanceScheduleView>({
    near: [],
    extended: [],
    full: [],
    effectiveMilesPerYear: 10_000,
  });
  const [verificationMaturity, setVerificationMaturity] = useState<VerificationMaturityView | null>(null);
  const [pipelinePhase, setPipelinePhase] = useState<PipelinePhase>("idle");
  const [ownerSetupComplete, setOwnerSetupComplete] = useState(false);

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
    const pendingReminderCount = reminders.filter((item) => item.effectiveStatus === "pending").length;
    const pendingVerificationCount = verifications.filter((item) => item.status === "pending").length;
    const pipelineLabel =
      pipelinePhase === "extracting"
        ? "Extracting manual…"
        : pipelinePhase === "syncing" || isBusy
          ? "Syncing vehicle state…"
          : "Pipeline idle";

    setSnapshot({
      label: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      mileage: vehicle.currentMileage,
      pendingReminderCount,
      pendingVerificationCount,
      lastServiceDate: last?.serviceDate ?? null,
      lastServiceShop: last?.shop ?? null,
      pipelinePhase: isBusy || pipelinePhase !== "idle" ? (pipelinePhase === "idle" ? "syncing" : pipelinePhase) : "idle",
      pipelineLabel,
    });
  }, [vehicle, timeline, reminders, verifications, isBusy, pipelinePhase, setSnapshot]);

  useReminderNotifications(reminders);

  useEffect(() => {
    return () => setSnapshot(null);
  }, [setSnapshot]);

  const applyQueueState = useCallback((body: {
    nowQueue: QueueItem[];
    reminders?: OwnerReminderItem[];
    verifications?: QueueItem[];
  }) => {
    setNowQueue(body.nowQueue);
    setReminders(body.reminders ?? []);
    setVerifications(
      body.verifications ?? body.nowQueue.filter((item) => item.taskKind === "verification"),
    );
  }, []);

  const loadVehicleState = useCallback(
    async (nextVehicle: Vehicle) => {
      const response = await fetch(`${apiBase}/api/vehicles/${nextVehicle.id}/state`);
      if (!response.ok) return;

      const body = (await response.json()) as {
        timeline: TimelineEntry[];
        nowQueue: QueueItem[];
        reminders?: OwnerReminderItem[];
        verifications?: QueueItem[];
        ownershipRecords?: OwnershipRecordEntry[];
        quoteAnalyses?: QuoteAnalysisView[];
        evidenceVault?: EvidenceVaultItem[];
        knowledgeSchedule?: { serviceName: string; intervalMiles?: number; manualTitle: string }[];
        maintenanceSchedule?: MaintenanceScheduleView;
        verificationMaturity?: VerificationMaturityView | null;
        currentMileage?: number;
      };

      setTimeline(body.timeline);
      setOwnershipRecords(body.ownershipRecords ?? []);
      applyQueueState(body);
      setQuoteAnalyses(body.quoteAnalyses ?? []);
      setEvidenceVault(body.evidenceVault ?? []);
      setKnowledgeSchedule(body.knowledgeSchedule ?? []);
      setMaintenanceSchedule(
        body.maintenanceSchedule ?? {
          near: [],
          extended: [],
          full: [],
          effectiveMilesPerYear: 10_000,
        },
      );
      setVerificationMaturity(body.verificationMaturity ?? null);
      if (body.currentMileage && body.currentMileage > nextVehicle.currentMileage) {
        setVehicle({ ...nextVehicle, currentMileage: body.currentMileage });
      }
      setForm((current) => ({ ...current, mileage: body.currentMileage ?? nextVehicle.currentMileage }));
    },
    [apiBase, applyQueueState],
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
          setOwnerSetupComplete(isOwnerSetupComplete(existing));
          setForm((current) => ({ ...current, mileage: existing.currentMileage }));
          await loadVehicleState(existing);
        }
      } catch {
        if (isMounted) {
          feedback("Could not load your workspace. Refresh to try again.");
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
    setOwnerSetupComplete(true);
    setForm((current) => ({ ...current, mileage: created.currentMileage }));
    feedback("Setup complete. Import history anytime from the sidebar, or hand off receipts under Receipt intake.");
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
        duplicateSkipped?: boolean;
        error?: string;
      };
      if (!response.ok && response.status !== 409) throw new Error(body.error ?? "receipt failed");
      setTimeline(body.timeline);
      applyQueueState(body);
      if (body.conflict) {
        feedback("Conflict detected — check Owner verification in the sidebar.");
      } else if (body.duplicateSkipped) {
        feedback(
          "This service visit is already on file (same date, mileage, and shop). Receipt saved to Evidence vault — no duplicate row added.",
        );
      } else {
        feedback("Service recorded — check Reminders for your next action.");
      }
      setUploadedReceipt(null);
      setCaptureError("");
      setReceiptNeedsManualEntry(false);
      setForm((current) => ({ ...emptyReceiptForm, mileage: vehicle.currentMileage }));
    } catch {
      feedback("Receipt submission failed.");
    } finally {
      toast.dismiss(loadingToast);
      setIsBusy(false);
      setPipelinePhase("idle");
    }
  };

  const updateServiceRecord = async (serviceId: string, patch: Partial<TimelineEntry>) => {
    if (!vehicle) return;
    setIsBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/vehicles/${vehicle.id}/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = (await response.json()) as {
        timeline?: TimelineEntry[];
        currentMileage?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Could not update service record.");
      if (body.timeline) setTimeline(body.timeline);
      if (typeof body.currentMileage === "number") {
        setVehicle((current) => (current ? { ...current, currentMileage: body.currentMileage! } : current));
      }
      feedback(isDeveloper ? "Service record updated." : "Service history updated.");
    } catch (error) {
      feedback(error instanceof Error ? error.message : "Could not update service record.");
      throw error;
    } finally {
      setIsBusy(false);
    }
  };

  const decide = async (
    taskId: string,
    decision: "approve" | "dismiss" | "snooze",
    snoozeDays?: number,
  ) => {
    if (!vehicle) return;
    setIsBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/tasks/${taskId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: vehicle.id, decision, snoozeDays }),
      });
      if (!response.ok) throw new Error("decide failed");
      const body = (await response.json()) as {
        nowQueue: QueueItem[];
        reminders?: OwnerReminderItem[];
        verifications?: QueueItem[];
      };
      applyQueueState(body);
      if (decision === "snooze") {
        feedback(`Snoozed${snoozeDays ? ` for ${snoozeDays} days` : ""}.`);
      } else if (decision === "approve") {
        feedback("Marked done.");
      } else {
        feedback("Dismissed.");
      }
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
      applyQueueState(body);
      if (body.created && body.recommendation) {
        feedback(`New reminder: ${body.recommendation.title}`);
        setActiveSection("reminders");
      } else if (body.skippedReason === "already_pending") {
        feedback("That reminder is already on your list.");
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

  const pendingReminderCount = reminders.filter((item) => item.effectiveStatus === "pending").length;
  const pendingVerificationCount = verifications.filter((item) => item.status === "pending").length;

  const headerAction =
    isDeveloper && (activeSection === "reminders" || activeSection === "now") ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isBusy || isRefreshingNow}
        onClick={() => void refreshNowQueue()}
      >
        {isRefreshingNow ? "Refreshing…" : "Refresh from schedule"}
      </Button>
    ) : isDeveloper && activeSection === "receipts" ? (
      <Button type="button" size="sm" disabled={isBusy || !uploadedReceipt} onClick={() => void submitReceipt()}>
        Confirm receipt
      </Button>
    ) : null;

  useEffect(() => {
    document.title = `${sectionMeta.label} · VehicleOS`;
  }, [sectionMeta.label]);

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading workspace">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
        <PanelCard title="Loading" description="Opening your workspace…">
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

  if (!ownerSetupComplete) {
    return (
      <SetupDriverGate
        vehicleId={vehicle.id}
        vehicleLabel={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
        onComplete={() => setOwnerSetupComplete(true)}
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={isDeveloper ? "Assistant workspace · Developer" : "Assistant workspace"}
        title={sectionMeta.label}
        description={isDeveloper ? sectionMeta.description : undefined}
        badge={
          isDeveloper ? (
            <>
              {vehicleLabel ? (
                <Badge variant="secondary" className="tabular-nums font-normal">
                  {vehicleLabel}
                </Badge>
              ) : null}
              {activeSection === "reminders" && pendingReminderCount > 0 ? (
                <Badge className="tabular-nums">{pendingReminderCount} due</Badge>
              ) : null}
              {activeSection === "now" && pendingVerificationCount > 0 ? (
                <Badge className="tabular-nums">{pendingVerificationCount} to verify</Badge>
              ) : null}
            </>
          ) : null
        }
        action={headerAction}
      />

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Viewing {sectionMeta.label} section
      </p>

      {activeSection === "reminders" && timeline.length === 0 ? (
        <ImportHistoryNudge
          vehicleId={vehicle.id}
          timelineEmpty={timeline.length === 0}
          onImport={() => setActiveSection("imports")}
        />
      ) : null}

      {activeSection === "reminders" ? (
        <PanelCard
          hideHeader={!isDeveloper}
          title="Reminders"
          description="Calendar-first nudges — act this week, snooze, or mark scheduled. The assistant handles mileage math."
        >
          <RemindersConsole items={reminders} disabled={isBusy} onDecide={decide} minimal={!isDeveloper} />
        </PanelCard>
      ) : null}

      {activeSection === "now" ? (
        <PanelCard
          hideHeader={!isDeveloper}
          title="Owner verification"
          description="Rare conflicts — resolve when the assistant can't settle records alone."
        >
          <div className="space-y-4">
            {isDeveloper && verificationMaturity ? (
              <VerificationMaturityPanel maturity={verificationMaturity} />
            ) : null}
            <NowQueueConsole
              items={verifications.length > 0 ? verifications : nowQueue}
              disabled={isBusy}
              vehicleId={vehicle.id}
              apiBase={apiBase}
              currentMileage={vehicle.currentMileage}
              onDecide={decide}
              ownerSimple={!isDeveloper}
              onOdometerSaved={() => {
                if (vehicle) void loadVehicleState(vehicle);
              }}
              onError={(message) => feedback(message)}
            />
          </div>
        </PanelCard>
      ) : null}

      {activeSection === "timeline" ? (
        <PanelCard
          hideHeader={!isDeveloper}
          title="Service history"
          description="Past maintenance, forward OEM schedule, and RMV/DMV ownership records."
        >
          <MaintenanceTimelineSection
            timeline={timeline}
            ownershipRecords={ownershipRecords}
            scheduleNear={maintenanceSchedule.near}
            scheduleExtended={maintenanceSchedule.extended}
            scheduleFull={maintenanceSchedule.full}
            effectiveMilesPerYear={maintenanceSchedule.effectiveMilesPerYear}
            activeTab={serviceHistoryTab}
            onTabChange={setServiceHistoryTab}
            historyOnly={!isDeveloper}
            ownerSimple={!isDeveloper}
            disabled={isBusy}
            onOpenEvidence={openEvidence}
            onUpdateService={updateServiceRecord}
            requireEditConfirmation={!isDeveloper}
            onGoToImport={() => setActiveSection("imports")}
          />
        </PanelCard>
      ) : null}

      {activeSection === "imports" ? (
        <PanelCard
          hideHeader={!isDeveloper}
          title="Import history"
          description="Upload portal PDFs or JSON — CARFAX service history and RMV/DMV ownership."
        >
          <RecordImportPanel
            vehicleId={vehicle.id}
            apiBase={apiBase}
            disabled={isBusy}
            onError={(message) => notify(message, "error")}
            onCarfaxImported={(body) => {
              setTimeline(body.timeline as TimelineEntry[]);
              if (body.maintenanceSchedule) {
                setMaintenanceSchedule(body.maintenanceSchedule as MaintenanceScheduleView);
              }
              const skipped = body.skippedCount ?? 0;
              if (body.importedCount === 0 && skipped > 0) {
                feedback(`All ${skipped} row(s) already on your timeline — nothing new imported.`);
              } else if (skipped > 0) {
                feedback(
                  `${body.importedCount} new service row(s) imported (${skipped} duplicate(s) skipped). Check Service history.`,
                );
              } else {
                feedback(`${body.importedCount} service row(s) imported — check Service history.`);
              }
              void loadVehicleState(vehicle);
            }}
            onRmvImported={(body) => {
              setOwnershipRecords(body.ownershipRecords as OwnershipRecordEntry[]);
              const skipped = body.skippedCount ?? 0;
              if (body.importedCount === 0 && skipped > 0) {
                feedback(`All ${skipped} ownership record(s) already on file — nothing new imported.`);
                setServiceHistoryTab("ownership");
                setActiveSection("timeline");
              } else if (skipped > 0) {
                setServiceHistoryTab("ownership");
                setActiveSection("timeline");
                feedback(
                  `${body.importedCount} new ownership record(s) imported (${skipped} duplicate(s) skipped).`,
                );
              } else if (body.importedCount > 0) {
                setServiceHistoryTab("ownership");
                setActiveSection("timeline");
                feedback(`${body.importedCount} ownership record(s) imported — see Ownership tab.`);
              }
              void loadVehicleState(vehicle);
            }}
          />
        </PanelCard>
      ) : null}

      {activeSection === "receipts" ? (
        isDeveloper ? (
        <PanelCard
          title="Upload receipt"
          description="Upload, confirm details, and run the service loop."
          variant="inset"
        >
          <ReceiptCapture
            vehicleId={vehicle.id}
            apiBase={apiBase}
            disabled={isBusy}
            onUploaded={(upload) => {
              setUploadedReceipt(upload);
              if (upload) {
                setReceiptNeedsManualEntry(true);
                setForm((current) => ({
                  ...emptyReceiptForm,
                  mileage: vehicle.currentMileage || current.mileage,
                }));
              } else {
                setReceiptNeedsManualEntry(false);
              }
            }}
            onError={(message) => {
              setCaptureError(message);
              notify(message, "error");
            }}
          />
          {captureError ? <p className="text-sm text-destructive">{captureError}</p> : null}
          {receiptNeedsManualEntry ? <ExtractionStatusBanner variant="llm-not-ready-manual" /> : null}
          <div className="surface-panel space-y-4 p-4">
            <p className="text-[13px] font-medium text-foreground">
              Service details{receiptNeedsManualEntry ? " (manual entry required)" : ""}
            </p>
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
              <DateField
                id="receipt-date"
                value={form.serviceDate}
                max={todayIsoDate()}
                disabled={isBusy}
                onChange={(serviceDate) => setForm({ ...form, serviceDate })}
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
        ) : (
          <PanelCard hideHeader>
            <OwnerReceiptHandoff
              vehicleId={vehicle.id}
              apiBase={apiBase}
              currentMileage={vehicle.currentMileage}
              disabled={isBusy}
              onHandedOff={() => {
                feedback("Receipt handed off — your assistant will file it.");
                void loadVehicleState(vehicle);
              }}
              onError={(message) => notify(message, "error")}
            />
          </PanelCard>
        )
      ) : null}

      {isDeveloper && activeSection === "evidence" ? (
        <PanelCard title="Evidence vault" description="Immutable artifacts — table and inspection panel.">
          <EvidenceVaultConsole
            vehicleId={vehicle.id}
            apiBase={apiBase}
            items={evidenceVault}
            linkedDocumentIds={timeline.flatMap((entry) => entry.evidenceIds)}
          />
        </PanelCard>
      ) : null}

      {isDeveloper && activeSection === "context" ? (
        <div className="space-y-6">
          <PanelCard
            title="Manual & OEM"
            description="Like onboarding a new assistant — upload the basics so recommendations start from your car, not a blank slate."
          >
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
                feedback("Schedule saved — your assistant now uses this maintenance context.");
                void loadVehicleState(vehicle);
              }}
            />
            {knowledgeSchedule.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm">
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
        </div>
      ) : null}

      {isDeveloper && activeSection === "notes" ? (
        <div className="space-y-6">
          <PanelCard title="Voice note" description="Capture what happened at the shop in your own words.">
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
                    ? "Conflict detected — check Owner verification in the sidebar."
                    : "Voice note saved — check Owner verification for next steps.",
                );
                void loadVehicleState(vehicle);
              }}
            />
          </PanelCard>

          <PanelCard title="Owner note" description="Structured entry when you did the work yourself or want a precise record.">
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
                    ? "Conflict detected — check Owner verification in the sidebar."
                    : "Owner note saved to your service history.",
                );
                void loadVehicleState(vehicle);
              }}
            />
          </PanelCard>
        </div>
      ) : null}

      {isDeveloper && activeSection === "quotes" ? (
        <div className="space-y-6">
          <PanelCard title="Quote check" description="Paste a dealer quote — compare against your history and fair range.">
            <QuoteAnalysisPanel
              vehicleId={vehicle.id}
              apiBase={apiBase}
              disabled={isBusy}
              history={quoteAnalyses}
              onAnalyzed={(analysis) => setQuoteAnalyses((current) => [...current, analysis].slice(-5))}
            />
          </PanelCard>

          <PanelCard title="Seasonal prompts" description="Calendar and driving-context nudges — not a weather app.">
            <SeasonalPromptsPanel
              vehicleId={vehicle.id}
              apiBase={apiBase}
              disabled={isBusy}
              onError={(message) => notify(message, "error")}
              onRefreshed={(body) => {
                setNowQueue(body.nowQueue as QueueItem[]);
                if (body.created.length > 0) {
                  feedback(`${body.created.length} seasonal prompt(s) added to Owner verification.`);
                }
              }}
            />
          </PanelCard>
        </div>
      ) : null}
    </>
  );
}
