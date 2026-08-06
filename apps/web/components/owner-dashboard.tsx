"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PanelCard } from "@/components/panel-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { APP_SECTIONS, useAppUiStore } from "@/lib/store/app-ui-store";
import {
  parseMaintenanceItemDeepLink,
  parseOwnerAttentionDeepLink,
} from "@/lib/attention-deep-link";
import { parseDashboardSection } from "@/lib/app-section-nav";
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
import { OwnerServiceNotePanel } from "./owner-service-note-panel";
import { openEvidenceDocument } from "../lib/evidence-access";
import { useVehicleConsole } from "@/lib/vehicle-console-context";
import { useGarage } from "@/lib/garage/garage-context";
import { isGarageSwitchLocked } from "@/lib/garage/types";
import { RecordImportPanel } from "./record-import-panel";
import { DateField } from "@/components/date-field";
import { todayIsoDate } from "@/lib/date-input";
import { ImportHistoryNudge } from "./import-history-nudge";
import { VerificationMaturityPanel } from "./verification-maturity-panel";
import { OwnerHabitsCompliancePanel } from "./owner-habits-compliance-panel";
import { draftLineItems, type MaintenanceRecordDraft } from "@/components/maintenance-record-fields";
import { resolveWorkspacePresentation } from "@/lib/workspace-presentation";
import type {
  MaintenanceScheduleView,
  OwnershipRecordEntry,
  OwnerDueItemsView,
  OwnerHistoryItem,
  PipelinePhase,
  OwnerReminderItem,
  QueueItem,
  ServiceHistoryTab,
  TimelineEntry,
  VerificationMaturityView,
} from "@/lib/console-types";
import { isOnboardingBaselineRule, type OwnerContextMemory } from "@vehicleos/domain";

type Vehicle = OnboardingVehicle;

const emptyReceiptForm = {
  shop: "",
  serviceDate: "",
  mileage: 0,
  lineItems: "",
  total: "",
};

function HomeWorkspaceSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Preparing Home">
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
        <div className="space-y-4 rounded-xl border border-border/70 bg-card p-5 shadow-sm">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="space-y-4 rounded-xl border border-border/70 bg-card p-5 shadow-sm">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    </div>
  );
}

export function OwnerDashboard() {
  const router = useRouter();
  const apiBase = getApiBase();
  const { setSnapshot } = useVehicleConsole();
  const garage = useGarage();
  const clearVehicleSelections = useAppUiStore((state) => state.clearVehicleSelections);
  const activeSection = useAppUiStore((state) => state.activeSection);
  const consoleMode = useAppUiStore((state) => state.consoleMode);
  const setActiveSection = useAppUiStore((state) => state.setActiveSection);
  const setSelectedTimelineId = useAppUiStore((state) => state.setSelectedTimelineId);
  const isDeveloper = consoleMode === "developer";
  const sectionMeta = APP_SECTIONS.find((section) => section.id === activeSection) ?? APP_SECTIONS[0];
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [ownershipRecords, setOwnershipRecords] = useState<OwnershipRecordEntry[]>([]);
  const [ownerDueItems, setOwnerDueItems] = useState<OwnerDueItemsView | null>(null);
  const [ownerHistoryTimeline, setOwnerHistoryTimeline] = useState<OwnerHistoryItem[]>([]);
  const [serviceHistoryTab, setServiceHistoryTab] = useState<ServiceHistoryTab>("schedule");
  const [historyAddRequest, setHistoryAddRequest] = useState(0);
  const [historyCompletionTaskId, setHistoryCompletionTaskId] = useState<string | null>(null);
  const [historyCompletionLineItem, setHistoryCompletionLineItem] = useState<string | null>(null);
  const [nowQueue, setNowQueue] = useState<QueueItem[]>([]);
  const [reminders, setReminders] = useState<OwnerReminderItem[]>([]);
  const [verifications, setVerifications] = useState<QueueItem[]>([]);
  const [focusedVerificationTaskId, setFocusedVerificationTaskId] = useState<string | null>(null);
  const [focusedReminderTaskId, setFocusedReminderTaskId] = useState<string | null>(null);
  const [focusedScheduleEntryId, setFocusedScheduleEntryId] = useState<string | null>(null);
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
  const [importBusy, setImportBusy] = useState(false);
  const [isVehicleStateLoading, setIsVehicleStateLoading] = useState(false);
  const hydratedVehicleIdRef = useRef<string | null>(null);

  const feedback = useCallback((message: string) => {
    notifyAuto(message);
  }, []);

  useEffect(() => {
    const reminderTaskId = parseOwnerAttentionDeepLink(window.location.search);
    const scheduleEntryId = parseMaintenanceItemDeepLink(window.location.search);
    const requestedSection = parseDashboardSection(window.location.search);
    setFocusedReminderTaskId(reminderTaskId);
    setFocusedVerificationTaskId(reminderTaskId);
    setFocusedScheduleEntryId(scheduleEntryId);

    if (scheduleEntryId) {
      setServiceHistoryTab("schedule");
      setActiveSection("timeline");
      return;
    }
    if (reminderTaskId) {
      setActiveSection("attention");
      return;
    }
    if (requestedSection) {
      setActiveSection(requestedSection);
    }
  }, [setActiveSection]);

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
    async (nextVehicle: Vehicle): Promise<Vehicle> => {
      const response = await fetch(`${apiBase}/api/vehicles/${nextVehicle.id}/state`);
      if (!response.ok) return nextVehicle;

      const body = (await response.json()) as {
        timeline: TimelineEntry[];
        nowQueue: QueueItem[];
        reminders?: OwnerReminderItem[];
        verifications?: QueueItem[];
        ownershipRecords?: OwnershipRecordEntry[];
        ownerDueItems?: OwnerDueItemsView;
        ownerHistoryTimeline?: OwnerHistoryItem[];
        quoteAnalyses?: QuoteAnalysisView[];
        evidenceVault?: EvidenceVaultItem[];
        knowledgeSchedule?: { serviceName: string; intervalMiles?: number; manualTitle: string }[];
        maintenanceSchedule?: MaintenanceScheduleView;
        verificationMaturity?: VerificationMaturityView | null;
        currentMileage?: number;
      };

      setTimeline(body.timeline);
      setOwnershipRecords(body.ownershipRecords ?? []);
      setOwnerDueItems(body.ownerDueItems ?? null);
      setOwnerHistoryTimeline(body.ownerHistoryTimeline ?? []);
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
      const hydratedVehicle =
        body.currentMileage && body.currentMileage > nextVehicle.currentMileage
          ? { ...nextVehicle, currentMileage: body.currentMileage }
          : nextVehicle;
      setVehicle((current) => (current?.id === nextVehicle.id ? hydratedVehicle : current));
      setForm((current) => ({ ...current, mileage: body.currentMileage ?? nextVehicle.currentMileage }));
      return hydratedVehicle;
    },
    [apiBase, applyQueueState],
  );

  const saveOwnerContextMemory = useCallback(
    async (memory: OwnerContextMemory, successMessage: string) => {
      if (!vehicle) throw new Error("No active vehicle.");

      setIsBusy(true);
      try {
        const response = await fetch(`${apiBase}/api/vehicles/${vehicle.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerContextMemory: memory }),
        });
        const body = (await response.json()) as {
          vehicle?: Vehicle;
          error?: string;
        };
        if (!response.ok || !body.vehicle) {
          throw new Error(body.error ?? "Could not save this preference.");
        }

        setVehicle(body.vehicle);
        await loadVehicleState(body.vehicle);
        feedback(successMessage);
        void garage.refreshGarage();
      } finally {
        setIsBusy(false);
      }
    },
    [apiBase, feedback, garage, loadVehicleState, vehicle],
  );

  const resetVehicleWorkspace = useCallback(() => {
    setTimeline([]);
    setOwnershipRecords([]);
    setOwnerDueItems(null);
    setOwnerHistoryTimeline([]);
    setNowQueue([]);
    setReminders([]);
    setVerifications([]);
    setQuoteAnalyses([]);
    setEvidenceVault([]);
    setKnowledgeSchedule([]);
    setMaintenanceSchedule({ near: [], extended: [], full: [], effectiveMilesPerYear: 10_000 });
    setVerificationMaturity(null);
    setForm(emptyReceiptForm);
    setUploadedReceipt(null);
    setReceiptNeedsManualEntry(false);
    setCaptureError("");
    setServiceHistoryTab("schedule");
    setPipelinePhase("idle");
    clearVehicleSelections();
  }, [clearVehicleSelections]);

  useEffect(() => {
    const lock = isGarageSwitchLocked({
      isBusy,
      isRefreshingNow,
      pipelinePhase,
      importBusy,
    });
    garage.setSwitchLock(lock);
  }, [garage.setSwitchLock, importBusy, isBusy, isRefreshingNow, pipelinePhase]);

  useEffect(() => {
    if (garage.isLoading) return;

    if (garage.isAddingVehicle) {
      setIsVehicleStateLoading(false);
      setIsLoading(false);
      return;
    }

    const nextVehicle =
      garage.vehicles.find((entry) => entry.id === garage.activeVehicleId) ?? null;
    if (!nextVehicle) {
      resetVehicleWorkspace();
      setVehicle(null);
      setOwnerSetupComplete(false);
      setIsLoading(false);
      return;
    }

    if (hydratedVehicleIdRef.current === nextVehicle.id) {
      setVehicle((current) => current ?? nextVehicle);
      setOwnerSetupComplete(isOwnerSetupComplete(nextVehicle));
      setForm((current) => ({ ...current, mileage: nextVehicle.currentMileage }));
      setIsVehicleStateLoading(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setForm((current) => ({ ...current, mileage: nextVehicle.currentMileage }));
    resetVehicleWorkspace();
    setIsVehicleStateLoading(true);

    void loadVehicleState(nextVehicle)
      .then((hydratedVehicle) => {
        if (cancelled) return;
        hydratedVehicleIdRef.current = hydratedVehicle.id;
        setVehicle(hydratedVehicle);
        setOwnerSetupComplete(isOwnerSetupComplete(hydratedVehicle));
      })
      .catch(() => {
        if (cancelled) return;
        setVehicle(nextVehicle);
        setOwnerSetupComplete(isOwnerSetupComplete(nextVehicle));
      })
      .finally(() => {
        if (!cancelled) {
          setIsVehicleStateLoading(false);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    garage.activeVehicleId,
    garage.isAddingVehicle,
    garage.isLoading,
    garage.vehicles,
    loadVehicleState,
    resetVehicleWorkspace,
  ]);

  const handleOnboardingComplete = async (created: OnboardingVehicle) => {
    const isAdditional = garage.vehicles.length > 0;
    let hydratedVehicle = created;

    try {
      hydratedVehicle = await loadVehicleState(created);
      hydratedVehicleIdRef.current = hydratedVehicle.id;
    } catch {
      // The vehicle exists already. Let the normal vehicle-state effect retry
      // after the setup surface closes instead of blocking the owner here.
    }

    setVehicle(hydratedVehicle);
    setOwnerSetupComplete(true);
    setForm((current) => ({ ...current, mileage: hydratedVehicle.currentMileage }));
    feedback(
      isAdditional
        ? "Vehicle added."
        : "You're set — Home will show what needs attention.",
    );
    garage.completeAddVehicle(hydratedVehicle);
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
        feedback("Conflict detected — review it in Your attention.");
      } else if (body.duplicateSkipped) {
        feedback(
          "This service visit is already on file (same date, mileage, and shop). Receipt saved to Evidence vault — no duplicate row added.",
        );
      } else {
        feedback("Service recorded — Home has your next action.");
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
        nowQueue?: QueueItem[];
        reminders?: OwnerReminderItem[];
        verifications?: QueueItem[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Could not update service record.");
      if (body.timeline) setTimeline(body.timeline);
      if (typeof body.currentMileage === "number") {
        setVehicle((current) => (current ? { ...current, currentMileage: body.currentMileage! } : current));
      }
      if (body.nowQueue) {
        applyQueueState({
          nowQueue: body.nowQueue,
          reminders: body.reminders,
          verifications: body.verifications,
        });
      }
      feedback(isDeveloper ? "Service record updated." : "Maintenance history updated.");
      const refreshedVehicle =
        typeof body.currentMileage === "number"
          ? { ...vehicle, currentMileage: body.currentMileage }
          : vehicle;
      await loadVehicleState(refreshedVehicle);
    } catch (error) {
      feedback(error instanceof Error ? error.message : "Could not update maintenance record.");
      throw error;
    } finally {
      setIsBusy(false);
    }
  };

  const updateCurrentMileage = async (mileage: number) => {
    if (!vehicle) return;
    if (!Number.isFinite(mileage) || mileage <= 0) {
      throw new Error("Enter a valid odometer reading.");
    }
    setIsBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/vehicles/${vehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentMileage: Math.round(mileage) }),
      });
      const body = (await response.json()) as { vehicle?: Vehicle; error?: string };
      if (!response.ok || !body.vehicle) {
        throw new Error(body.error ?? "Could not update mileage.");
      }
      setVehicle(body.vehicle);
      await loadVehicleState(body.vehicle);
      feedback(`Odometer updated to ${body.vehicle.currentMileage.toLocaleString("en-US")} miles.`);
      void garage.refreshGarage();
    } finally {
      setIsBusy(false);
    }
  };

  const mergeServiceRecords = async (
    targetServiceId: string,
    mergedServiceId: string,
    lineItems: string[],
  ) => {
    if (!vehicle) return;
    setIsBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/vehicles/${vehicle.id}/services/${targetServiceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mergedServiceId, lineItems }),
      });
      const body = (await response.json()) as {
        timeline?: TimelineEntry[];
        currentMileage?: number;
        nowQueue?: QueueItem[];
        reminders?: OwnerReminderItem[];
        verifications?: QueueItem[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Could not merge service records.");
      if (body.timeline) setTimeline(body.timeline);
      if (typeof body.currentMileage === "number") {
        setVehicle((current) => (current ? { ...current, currentMileage: body.currentMileage! } : current));
      }
      if (body.nowQueue) {
        applyQueueState({
          nowQueue: body.nowQueue,
          reminders: body.reminders,
          verifications: body.verifications,
        });
      }
      feedback("Records merged. The original history remains in VehicleOS's audit log.");
    } catch (error) {
      feedback(error instanceof Error ? error.message : "Could not merge service records.");
      throw error;
    } finally {
      setIsBusy(false);
    }
  };

  const addMaintenanceRecord = async (draft: MaintenanceRecordDraft) => {
    if (!vehicle) return;
    const lineItems = draftLineItems(draft);
    if (lineItems.length === 0) {
      feedback("Add at least one line item.");
      return;
    }

    setIsBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/vehicles/${vehicle.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop: draft.shop.trim() || undefined,
          shopLocation: draft.shopLocation.trim() || undefined,
          serviceDate: draft.serviceDate,
          mileage: Number(draft.mileage),
          lineItems,
          total: draft.total.trim() || undefined,
          source: "owner_note",
          completedTaskId: draft.attentionTaskId,
        }),
      });
      const body = (await response.json()) as {
        timeline?: TimelineEntry[];
        currentMileage?: number;
        error?: string;
        conflict?: boolean;
        nowQueue?: QueueItem[];
        reminders?: OwnerReminderItem[];
        verifications?: QueueItem[];
      };
      if (!response.ok && response.status !== 409) {
        throw new Error(body.error ?? "Could not save maintenance record.");
      }
      if (body.timeline) setTimeline(body.timeline);
      if (typeof body.currentMileage === "number") {
        setVehicle((current) => (current ? { ...current, currentMileage: body.currentMileage! } : current));
      }
      if (body.nowQueue) {
        applyQueueState({
          nowQueue: body.nowQueue,
          reminders: body.reminders,
          verifications: body.verifications,
        });
      }
      setHistoryCompletionTaskId(null);
      feedback(
        body.conflict
          ? "Not completed — fix the conflicting record before saving."
          : draft.attentionTaskId
            ? "Maintenance recorded and Home updated."
            : "Maintenance record saved.",
      );
      await loadVehicleState(
        typeof body.currentMileage === "number"
          ? { ...vehicle, currentMileage: body.currentMileage }
          : vehicle,
      );
    } catch (error) {
      feedback(error instanceof Error ? error.message : "Could not save maintenance record.");
      throw error;
    } finally {
      setIsBusy(false);
    }
  };

  const decide = async (
    taskId: string,
    decision: "schedule" | "approve" | "dismiss",
  ) => {
    if (!vehicle) return;
    setIsBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/tasks/${taskId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: vehicle.id, decision }),
      });
      if (!response.ok) throw new Error("decide failed");
      const body = (await response.json()) as {
        nowQueue: QueueItem[];
        reminders?: OwnerReminderItem[];
        verifications?: QueueItem[];
      };
      applyQueueState(body);
      if (focusedVerificationTaskId === taskId) {
        setFocusedVerificationTaskId(null);
      }
      if (decision === "schedule") {
        feedback("Marked scheduled.");
      } else if (decision === "approve") {
        feedback("Verified.");
      } else {
        feedback("Removed from Home.");
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
        feedback(`New car action: ${body.recommendation.title}`);
        setActiveSection("attention");
      } else if (body.skippedReason === "already_pending") {
        feedback("That item is already open in Your attention.");
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
  const pendingVerifications = verifications.filter((item) => item.status === "pending");
  const blockingVerifications = pendingVerifications.filter((item) => item.severity !== "advisory");
  const advisoryVerifications = pendingVerifications.filter((item) => item.severity === "advisory");
  const pendingVerificationCount = pendingVerifications.length;

  const openVerificationTask = (taskId: string) => {
    setFocusedVerificationTaskId(taskId);
    setActiveSection("attention");
  };

  const reviewVerificationTarget = (item: QueueItem) => {
    const target = item.target;
    if (!target || target.surface === "home") {
      openVerificationTask(item.taskId);
      return;
    }
    if (target.surface === "vehicle") {
      router.push("/garage?tab=car");
      return;
    }
    if (target.surface === "imports") {
      setActiveSection("imports");
      return;
    }

    setServiceHistoryTab(target.surface === "history" ? "history" : "schedule");
    setActiveSection("timeline");
    if (target.surface === "history" && target.recordId) {
      setSelectedTimelineId(target.recordId);
    }
    if (target.surface === "schedule" && target.recordId) {
      setFocusedScheduleEntryId(target.recordId);
    }
  };

  const headerAction =
    isDeveloper && (activeSection === "reminders" || activeSection === "attention" || activeSection === "now") ? (
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

  const workspacePresentation = resolveWorkspacePresentation({
    hasVehicle: Boolean(vehicle),
    ownerSetupComplete,
    isDashboardLoading: isLoading,
    isGarageLoading: garage.isLoading,
    isVehicleStateLoading,
    isAddingVehicle: garage.isAddingVehicle,
  });

  if (workspacePresentation.body === "loading") {
    return <HomeWorkspaceSkeleton />;
  }

  if (workspacePresentation.body === "first-vehicle-setup") {
    return (
      <div className="mx-auto w-full max-w-lg">
        <OnboardingWizard prefillDogfood={isDeveloper} onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  if (workspacePresentation.body === "driver-setup" && vehicle) {
    return (
      <div className="mx-auto w-full max-w-lg">
        <SetupDriverGate
          vehicleId={vehicle.id}
          vehicleLabel={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          onComplete={() => setOwnerSetupComplete(true)}
        />
      </div>
    );
  }

  if (!vehicle) return <HomeWorkspaceSkeleton />;

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
              {activeSection === "attention" && pendingReminderCount + pendingVerificationCount > 0 ? (
                <Badge className="tabular-nums">
                  {pendingReminderCount + pendingVerificationCount} open
                </Badge>
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

      {activeSection === "reminders" &&
      timeline.length === 0 &&
      !reminders.some((item) => isOnboardingBaselineRule(item.ruleId)) ? (
        <ImportHistoryNudge
          vehicleId={vehicle.id}
          timelineEmpty={timeline.length === 0}
          onImport={() => setActiveSection("imports")}
        />
      ) : null}

      {activeSection === "reminders" ? (
        <div className="space-y-6">
          {blockingVerifications.length > 0 ? (
            <PanelCard
              title={
                blockingVerifications.length === 1
                  ? "The assistant needs your confirmation"
                  : `${blockingVerifications.length} details need your confirmation`
              }
              description="A record cannot be settled safely until you confirm it."
            >
              <NowQueueConsole
                items={blockingVerifications}
                disabled={isBusy}
                vehicleId={vehicle.id}
                apiBase={apiBase}
                currentMileage={vehicle.currentMileage}
                onDecide={decide}
                onReviewTarget={reviewVerificationTarget}
                focusTaskId={focusedVerificationTaskId}
                ownerSimple
                onOdometerSaved={() => {
                  if (vehicle) void loadVehicleState(vehicle);
                }}
                onVerificationResolved={() => {
                  if (vehicle) void loadVehicleState(vehicle);
                  feedback("Saved. The assistant will use this context going forward.");
                }}
                onError={(message) => feedback(message)}
              />
            </PanelCard>
          ) : null}

          <PanelCard
            hideHeader={!isDeveloper}
            title="What needs attention"
            description="This week leads. Next week and this month stay visible for planning."
          >
            <RemindersConsole
              items={reminders}
              disabled={isBusy}
              focusTaskId={focusedReminderTaskId}
              onScheduled={(taskId) => void decide(taskId, "schedule")}
              onNotNeeded={(taskId) => void decide(taskId, "dismiss")}
              onRecordDone={(item) => {
                setHistoryCompletionTaskId(item.taskId);
                setHistoryCompletionLineItem(
                  item.intelligence?.serviceAction.recordLineItem ?? item.title,
                );
                setServiceHistoryTab("history");
                setHistoryAddRequest((current) => current + 1);
                setActiveSection("timeline");
                feedback("Add the completed service so the schedule can update from the record.");
              }}
              onStartBaseline={() => {
                setHistoryCompletionTaskId(null);
                setHistoryCompletionLineItem(null);
                setServiceHistoryTab("history");
                setHistoryAddRequest((current) => current + 1);
                setActiveSection("timeline");
                feedback("Add any completed service to set your maintenance baseline.");
              }}
              onFixData={(item) => {
                const serviceAction = item.intelligence?.serviceAction;
                setServiceHistoryTab("history");
                setActiveSection("timeline");
                if (serviceAction?.baselineServiceId) {
                  setSelectedTimelineId(serviceAction.baselineServiceId);
                  feedback("Opened the exact service record that anchors this reminder.");
                  return;
                }
                setHistoryCompletionTaskId(null);
                setHistoryCompletionLineItem(serviceAction?.recordLineItem ?? item.title);
                setHistoryAddRequest((current) => current + 1);
                feedback("No baseline exists yet. Add the missing service record here.");
              }}
              minimal={!isDeveloper}
            />
          </PanelCard>

          {advisoryVerifications.length > 0 ? (
            <PanelCard
              title={
                advisoryVerifications.length === 1
                  ? "One detail to confirm"
                  : `${advisoryVerifications.length} details to confirm`
              }
              description="This improves future timing, but it does not block today's maintenance record."
            >
              <NowQueueConsole
                items={advisoryVerifications}
                disabled={isBusy}
                vehicleId={vehicle.id}
                apiBase={apiBase}
                currentMileage={vehicle.currentMileage}
                onDecide={decide}
                onReviewTarget={reviewVerificationTarget}
                focusTaskId={focusedVerificationTaskId}
                ownerSimple
                onOdometerSaved={() => {
                  if (vehicle) void loadVehicleState(vehicle);
                }}
                onVerificationResolved={() => {
                  if (vehicle) void loadVehicleState(vehicle);
                  feedback("Saved. The assistant will use this context going forward.");
                }}
                onError={(message) => feedback(message)}
              />
            </PanelCard>
          ) : null}
        </div>
      ) : null}

      {activeSection === "attention" ? (
        <div className="space-y-6">
          <PanelCard
            hideHeader={!isDeveloper}
            title="Act for your car"
            description="Every open maintenance or compliance action, with the current next step."
          >
            <RemindersConsole
              items={reminders}
              disabled={isBusy}
              focusTaskId={focusedReminderTaskId}
              onScheduled={(taskId) => void decide(taskId, "schedule")}
              onNotNeeded={(taskId) => void decide(taskId, "dismiss")}
              onRecordDone={(item) => {
                setHistoryCompletionTaskId(item.taskId);
                setHistoryCompletionLineItem(
                  item.intelligence?.serviceAction.recordLineItem ?? item.title,
                );
                setServiceHistoryTab("history");
                setHistoryAddRequest((current) => current + 1);
                setActiveSection("timeline");
                feedback("Add the completed service so the schedule can update from the record.");
              }}
              onStartBaseline={() => {
                setHistoryCompletionTaskId(null);
                setHistoryCompletionLineItem(null);
                setServiceHistoryTab("history");
                setHistoryAddRequest((current) => current + 1);
                setActiveSection("timeline");
                feedback("Add any completed service to set your maintenance baseline.");
              }}
              onFixData={(item) => {
                const serviceAction = item.intelligence?.serviceAction;
                setServiceHistoryTab("history");
                setActiveSection("timeline");
                if (serviceAction?.baselineServiceId) {
                  setSelectedTimelineId(serviceAction.baselineServiceId);
                  feedback("Opened the exact service record that anchors this action.");
                  return;
                }
                setHistoryCompletionTaskId(null);
                setHistoryCompletionLineItem(serviceAction?.recordLineItem ?? item.title);
                setHistoryAddRequest((current) => current + 1);
                feedback("No baseline exists yet. Add the missing service record here.");
              }}
              minimal={!isDeveloper}
            />
          </PanelCard>

          <PanelCard
            hideHeader={!isDeveloper}
            title="Help the assistant"
            description="Answer only what VehicleOS cannot safely settle or personalize on its own."
          >
            <NowQueueConsole
              items={verifications.length > 0 ? verifications : nowQueue}
              disabled={isBusy}
              vehicleId={vehicle.id}
              apiBase={apiBase}
              currentMileage={vehicle.currentMileage}
              onDecide={decide}
              onReviewTarget={reviewVerificationTarget}
              focusTaskId={focusedVerificationTaskId}
              ownerSimple={!isDeveloper}
              onOdometerSaved={() => {
                if (vehicle) void loadVehicleState(vehicle);
              }}
              onVerificationResolved={() => {
                if (vehicle) void loadVehicleState(vehicle);
                feedback("Saved. The assistant will use this context going forward.");
              }}
              onError={(message) => feedback(message)}
            />
          </PanelCard>
        </div>
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
              onReviewTarget={reviewVerificationTarget}
              ownerSimple={!isDeveloper}
              onOdometerSaved={() => {
                if (vehicle) void loadVehicleState(vehicle);
              }}
              onVerificationResolved={() => {
                if (vehicle) void loadVehicleState(vehicle);
                feedback("Pattern saved — your assistant will use this in future attention windows.");
              }}
              onError={(message) => feedback(message)}
            />
          </div>
        </PanelCard>
      ) : null}

      {activeSection === "timeline" ? (
        <div className="space-y-6">
          <PanelCard
            hideHeader={!isDeveloper}
            title="Maintenance"
            description="Forward OEM schedule and unified service + RMV history."
          >
            <MaintenanceTimelineSection
            timeline={timeline}
            ownershipRecords={ownershipRecords}
            ownerDueItems={ownerDueItems}
            ownerHistoryTimeline={ownerHistoryTimeline}
            verifications={verifications}
            scheduleNear={maintenanceSchedule.near}
            scheduleExtended={maintenanceSchedule.extended}
            scheduleFull={maintenanceSchedule.full}
            effectiveMilesPerYear={maintenanceSchedule.effectiveMilesPerYear}
            hasKnowledgeSchedule={knowledgeSchedule.length > 0}
            activeTab={serviceHistoryTab}
            focusedScheduleEntryId={focusedScheduleEntryId}
            addRequestKey={historyAddRequest}
            addRequestTaskId={historyCompletionTaskId}
            addRequestLineItem={historyCompletionLineItem}
            onAddRequestHandled={() => {
              setHistoryAddRequest(0);
              setHistoryCompletionLineItem(null);
            }}
            onTabChange={setServiceHistoryTab}
            ownerSimple={!isDeveloper}
            disabled={isBusy}
            defaultMileage={vehicle.currentMileage}
            onOpenEvidence={openEvidence}
            onUpdateService={updateServiceRecord}
            onMergeService={mergeServiceRecords}
            onReviewVerification={openVerificationTask}
            onAddService={addMaintenanceRecord}
            onUpdateCurrentMileage={updateCurrentMileage}
            requireEditConfirmation={!isDeveloper}
            onGoToImport={() => setActiveSection("imports")}
            maintenancePatterns={vehicle.ownerContextMemory?.maintenancePatterns}
            observedMilesPerYear={maintenanceSchedule.observedMilesPerYear}
            statedMilesPerYear={maintenanceSchedule.statedMilesPerYear}
            dueSoonDays={maintenanceSchedule.dueSoonDays}
            ownerContextMemory={vehicle.ownerContextMemory}
            onSaveOwnerContextMemory={saveOwnerContextMemory}
            />
          </PanelCard>
          <PanelCard
            title="Owner habits & personal deadlines"
            description="Owner-confirmed schedules and renewals that do not change OEM truth."
          >
            <OwnerHabitsCompliancePanel
              vehicleId={vehicle.id}
              apiBase={apiBase}
              records={ownershipRecords.filter((record) => record.eventType === "license")}
              disabled={isBusy}
              onHabitProposed={() => {
                feedback("Habit extracted — confirm or edit the interval in Your attention.");
                setActiveSection("attention");
                void loadVehicleState(vehicle);
              }}
              onComplianceSaved={() => {
                feedback("Driver's-license deadline saved to your owner profile.");
                void loadVehicleState(vehicle);
              }}
              onError={(message) => feedback(message)}
            />
          </PanelCard>
        </div>
      ) : null}

      {activeSection === "imports" ? (
        <PanelCard
          hideHeader={!isDeveloper}
          title="Add records"
          description="Optional — upload CARFAX or RMV PDFs to sharpen baselines and owner-specific context."
        >
          <RecordImportPanel
            vehicleId={vehicle.id}
            vehicle={{
              vin: vehicle.vin,
              year: vehicle.year,
              make: vehicle.make,
              model: vehicle.model,
            }}
            apiBase={apiBase}
            ownerShopLocations={vehicle.ownerContextMemory?.shopLocations}
            existingTimeline={timeline}
            existingOwnershipRecords={ownershipRecords}
            disabled={isBusy}
            onActivityChange={setImportBusy}
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
                  `${body.importedCount} new service row(s) imported (${skipped} duplicate(s) skipped). Check Maintenance history.`,
                );
              } else {
                feedback(`${body.importedCount} service row(s) imported — check Maintenance history.`);
              }
              if (body.verificationTaskId) {
                feedback("Some imported rows need verification in your assistant queue.");
              }
              void loadVehicleState(vehicle);
            }}
            onRmvImported={(body) => {
              setOwnershipRecords(body.ownershipRecords as OwnershipRecordEntry[]);
              const skipped = body.skippedCount ?? 0;
              if (body.importedCount === 0 && skipped > 0) {
                feedback(`All ${skipped} ownership record(s) already on file — nothing new imported.`);
                setServiceHistoryTab("history");
                setActiveSection("timeline");
              } else if (skipped > 0) {
                setServiceHistoryTab("history");
                setActiveSection("timeline");
                feedback(
                  `${body.importedCount} new ownership record(s) imported (${skipped} duplicate(s) skipped).`,
                );
              } else if (body.importedCount > 0) {
                setServiceHistoryTab("history");
                setActiveSection("timeline");
                feedback(`${body.importedCount} ownership record(s) imported — see History tab.`);
              }
              if (body.profilePatch?.vin) {
                feedback(`VIN ${body.profilePatch.vin} saved from your RMV PDF.`);
              } else if (body.verificationTaskId) {
                feedback("Profile conflicts from the PDF need your review in the assistant queue.");
              }
              void loadVehicleState(vehicle);
            }}
          />
        </PanelCard>
      ) : null}

      {isDeveloper && activeSection === "receipts" ? (
        <PanelCard
          title="Upload receipt"
          description="Developer testing — upload, confirm details, and run the golden-path service loop."
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

      {workspacePresentation.showAdditionalVehicleSheet ? (
        <Dialog open>
          <DialogContent
            showClose={false}
            className="left-auto right-0 top-0 h-[100dvh] max-w-xl translate-x-0 translate-y-0 overflow-y-auto rounded-none border-l sm:rounded-none"
          >
            <DialogTitle className="sr-only">Add a vehicle</DialogTitle>
            <div className="p-4 sm:p-6">
              <OnboardingWizard
                mode="additional"
                prefillDogfood={isDeveloper}
                onCancel={() => garage.cancelAddVehicle()}
                onComplete={handleOnboardingComplete}
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
