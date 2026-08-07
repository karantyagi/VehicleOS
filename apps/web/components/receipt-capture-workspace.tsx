"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Camera, Car, CircleCheck, FileCheck2, FileText, Plus, Share2, Smartphone, WifiOff } from "lucide-react";
import { OwnerReceiptHandoff } from "@/components/owner-receipt-handoff";
import { PageHeader } from "@/components/page-header";
import { PanelCard } from "@/components/panel-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VehicleGarageSwitcher } from "@/components/vehicle-garage-switcher";
import { ServiceNotePanel } from "@/components/voice-memory-panel";
import { getApiBase } from "@/lib/api-base";
import { useGarage } from "@/lib/garage/garage-context";
import { formatGarageVehicleLabel } from "@/lib/garage/types";
import { notify } from "@/lib/notify";
import { recentServiceNoteStarters } from "@/lib/service-note-starters";
import { useAppUiStore } from "@/lib/store/app-ui-store";
import { useMediaQuery } from "@/lib/use-media-query";
import { useOnlineStatus } from "@/lib/use-online-status";
import { clearSharedReceipt, readSharedReceipt, type SharedReceipt } from "@/lib/local-receipt-draft";
import { cn } from "@/lib/utils";

type CaptureCompletion = {
  kind: "note" | "receipt";
  summary: string;
  needsReview: boolean;
};

const compactCaptureSummary = (value: string) => {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 100 ? `${normalized.slice(0, 97)}...` : normalized;
};

export function ReceiptCaptureWorkspace() {
  const apiBase = getApiBase();
  const garage = useGarage();
  const isDeveloper = useAppUiStore((state) => state.consoleMode) === "developer";
  const isMobileViewport = useMediaQuery("(max-width: 768px)");
  const isOnline = useOnlineStatus();
  const vehicle = garage.activeVehicle;
  const vehicleId = vehicle?.id;
  const [captureMode, setCaptureMode] = useState<"photo" | "note">("note");
  const [captureCompletion, setCaptureCompletion] = useState<CaptureCompletion | null>(null);
  const [recentStarters, setRecentStarters] = useState<string[]>([]);
  const [sharedReceipt, setSharedReceipt] = useState<SharedReceipt | null>(null);
  const [isUsingSharedReceipt, setIsUsingSharedReceipt] = useState(false);
  const [hasPendingCapture, setHasPendingCapture] = useState(false);
  const handledSharedReceiptState = useRef<string | null>(null);

  const clearLocalSharedReceipt = useCallback(() => {
    setSharedReceipt(null);
    setIsUsingSharedReceipt(false);
    void clearSharedReceipt().catch(() => undefined);
  }, []);

  const handleCaptureActivityChange = useCallback((pending: boolean) => {
    setHasPendingCapture(pending);
  }, []);

  const reloadGarage = useCallback(async () => {
    await garage.refreshGarage();
  }, [garage]);

  const loadRecentStarters = useCallback(async () => {
    setRecentStarters([]);
    if (!vehicleId) {
      return;
    }

    try {
      const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/state`);
      if (!response.ok) return;
      const body = (await response.json()) as {
        timeline?: { serviceDate?: string; lineItems?: unknown }[];
      };
      setRecentStarters(recentServiceNoteStarters(body.timeline ?? []));
    } catch {
      // Contextual starters are optional; the offline/default capture path still works.
    }
  }, [apiBase, vehicleId]);

  const setCaptureModeAndFocus = (mode: "photo" | "note") => {
    setCaptureMode(mode);
    window.requestAnimationFrame(() => {
      document.getElementById(`capture-${mode === "note" ? "service-note" : "receipt-photo"}-tab`)?.focus();
    });
  };

  const handleCaptureTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const nextMode = event.key === "ArrowLeft" || event.key === "Home" ? "note" : "photo";
    setCaptureModeAndFocus(nextMode);
  };

  useEffect(() => {
    if (!garage.isLoading && !vehicle && garage.vehicles.length > 0 && garage.activeVehicleId) {
      void garage.refreshGarage();
    }
  }, [garage, vehicle]);

  useEffect(() => {
    void loadRecentStarters();
  }, [loadRecentStarters]);

  useEffect(() => {
    const requestedCapture = new URLSearchParams(window.location.search).get("capture");
    if (requestedCapture === "note") setCaptureMode("note");
    if (requestedCapture === "receipt") setCaptureMode("photo");
  }, []);

  useEffect(() => {
    const sharedState = new URLSearchParams(window.location.search).get("shared");
    if (!sharedState || handledSharedReceiptState.current === sharedState) return;
    handledSharedReceiptState.current = sharedState;

    if (sharedState === "unsupported") {
      notify("VehicleOS can receive one receipt image or PDF up to 10 MB.", "error");
      return;
    }
    if (sharedState === "missing" || sharedState === "error") {
      notify("That shared receipt could not be held on this device. Try sharing it again.", "error");
      return;
    }
    if (sharedState !== "ready") return;

    void readSharedReceipt()
      .then((receipt) => {
        if (!receipt) {
          notify("That shared receipt is no longer available on this device. Try sharing it again.", "error");
          return;
        }
        setSharedReceipt(receipt);
        setCaptureMode("photo");
      })
      .catch(() => notify("That shared receipt could not be opened on this device.", "error"));
  }, []);

  useEffect(() => {
    garage.setSwitchLock(
      hasPendingCapture
        ? { locked: true, reason: "Finish or discard this capture before switching vehicles." }
        : { locked: false, reason: null },
    );
    return () => garage.setSwitchLock({ locked: false, reason: null });
  }, [garage.setSwitchLock, hasPendingCapture]);

  if (garage.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <PanelCard
        title="Add your vehicle first"
        description="Set up a vehicle to capture service notes, photos, and receipts from your phone."
      >
        <Button asChild type="button" variant="outline">
          <Link href="/">Set up your vehicle</Link>
        </Button>
      </PanelCard>
    );
  }

  const vehicleLabel = formatGarageVehicleLabel(vehicle);

  if (!isDeveloper && !isMobileViewport) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <PageHeader
          eyebrow="Mobile capture"
          title="Capture on your phone"
          description={`Service notes and receipt photos for ${vehicleLabel} - capture stays intentionally mobile-first.`}
          action={<VehicleGarageSwitcher compact />}
        />
        <PanelCard variant="inset">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <Smartphone className="h-10 w-10 text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Open VehicleOS on your phone or add it to your home screen, then use the{" "}
              <strong className="font-medium text-foreground">Add a record</strong> shortcut.
            </p>
            <p className="text-xs text-muted-foreground">
              Verification and service history stay on this web workspace - scoped to the selected vehicle.
            </p>
            <Button asChild type="button" variant="outline" size="sm">
              <Link href="/">Back to assistant workspace</Link>
            </Button>
          </div>
        </PanelCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        eyebrow="Mobile capture"
        title="Add a record"
        description={`Write it down when you know what changed. Add a receipt when it has the detail for ${vehicleLabel}.`}
        action={<VehicleGarageSwitcher compact />}
      />
      {!captureCompletion ? (
        <PanelCard
          variant="inset"
          className="overflow-hidden border-primary/15 bg-gradient-to-b from-primary/[0.035] to-[hsl(var(--surface-inset))]"
        >
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 px-0.5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Quick capture</p>
              <p className="mt-1 text-sm font-medium text-foreground">Add the record while it is fresh.</p>
            </div>
            <span className="rounded-full border border-border/80 bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground">
              Review before save
            </span>
          </div>
          {!isOnline ? (
            <section
              className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] p-3"
              role="status"
              aria-live="polite"
            >
              <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">You&apos;re offline</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Keep writing - your note stays on this device. Reconnect before saving a note or receipt.
                </p>
              </div>
            </section>
          ) : null}
          <section
            className="flex items-center gap-3 rounded-xl border border-border/75 bg-background/55 px-3 py-2.5"
            aria-label={`Capture target: ${vehicleLabel}`}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/[0.09] text-primary">
              <Car className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Capture target</p>
              <p className="truncate text-sm font-semibold text-foreground">{vehicleLabel}</p>
              {hasPendingCapture ? (
                <p className="mt-0.5 text-xs text-muted-foreground">Finish or discard before switching vehicles.</p>
              ) : null}
            </div>
          </section>
          <div
            className="grid grid-cols-2 rounded-xl border border-border/80 bg-background/65 p-1.5 shadow-sm"
            role="tablist"
            aria-label="Choose how to capture"
          >
            <Button
              id="capture-service-note-tab"
              type="button"
              role="tab"
              aria-selected={captureMode === "note"}
              aria-controls="capture-service-note-panel"
              tabIndex={captureMode === "note" ? 0 : -1}
              variant="ghost"
              className={cn(
                "h-10 rounded-lg text-muted-foreground",
                captureMode === "note" && "bg-card text-foreground shadow-[0_2px_8px_hsl(var(--foreground)/0.08)]",
              )}
              onClick={() => setCaptureMode("note")}
              onKeyDown={handleCaptureTabKeyDown}
            >
              <FileText className="mr-1.5 h-4 w-4" aria-hidden />
              Note
            </Button>
            <Button
              id="capture-receipt-photo-tab"
              type="button"
              role="tab"
              aria-selected={captureMode === "photo"}
              aria-controls="capture-receipt-photo-panel"
              tabIndex={captureMode === "photo" ? 0 : -1}
              variant="ghost"
              className={cn(
                "h-10 rounded-lg text-muted-foreground",
                captureMode === "photo" && "bg-card text-foreground shadow-[0_2px_8px_hsl(var(--foreground)/0.08)]",
              )}
              onClick={() => setCaptureMode("photo")}
              onKeyDown={handleCaptureTabKeyDown}
            >
              <Camera className="mr-1.5 h-4 w-4" aria-hidden />
              Receipt
            </Button>
          </div>

          {captureMode === "photo" ? (
            <section
              id="capture-receipt-photo-panel"
              role="tabpanel"
              aria-labelledby="capture-receipt-photo-tab"
              className="console-motion-fade"
            >
              {sharedReceipt && !isUsingSharedReceipt ? (
                <section className="space-y-4 rounded-xl border border-primary/20 bg-primary/[0.055] p-4" aria-live="polite">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                      <Share2 className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Shared receipt ready</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        It is held only on this device. Check the capture target above; nothing uploads until you choose Upload receipt.
                      </p>
                    </div>
                  </div>
                  <p className="truncate rounded-lg border border-border/70 bg-background/65 px-3 py-2 text-xs font-medium text-foreground">
                    {sharedReceipt.file.name || "Shared receipt"}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      className="h-10 rounded-xl"
                      disabled={!isOnline}
                      onClick={() => setIsUsingSharedReceipt(true)}
                    >
                      Use {vehicleLabel}
                    </Button>
                    <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={clearLocalSharedReceipt}>
                      Discard
                    </Button>
                  </div>
                </section>
              ) : (
                <OwnerReceiptHandoff
                  key={vehicle.id}
                  vehicleId={vehicle.id}
                  apiBase={apiBase}
                  currentMileage={vehicle.currentMileage}
                  disabled={!isOnline}
                  initialFile={isUsingSharedReceipt ? sharedReceipt?.file ?? null : null}
                  onHandedOff={({ needsReview }) => {
                    setCaptureCompletion({
                      kind: "receipt",
                      needsReview,
                      summary: `Receipt saved for ${vehicleLabel}.`,
                    });
                    void reloadGarage();
                  }}
                  onError={(message) => notify(message, "error")}
                  onInitialFileStored={clearLocalSharedReceipt}
                  onInitialFileDiscarded={clearLocalSharedReceipt}
                  onPendingChange={handleCaptureActivityChange}
                />
              )}
            </section>
          ) : (
            <section
              id="capture-service-note-panel"
              role="tabpanel"
              aria-labelledby="capture-service-note-tab"
              className="console-motion-fade"
            >
              <ServiceNotePanel
                key={vehicle.id}
                vehicleId={vehicle.id}
                apiBase={apiBase}
                defaultMileage={vehicle.currentMileage}
                minimal
                persistDraft
                recentStarters={recentStarters}
                isOnline={isOnline}
                onSubmitted={(body) => {
                  setCaptureCompletion({
                    kind: "note",
                    needsReview: body.conflict === true,
                    summary: compactCaptureSummary(body.transcript ?? "Service note saved."),
                  });
                  void reloadGarage();
                  void loadRecentStarters();
                }}
                onError={(message) => {
                  if (message) notify(message, "error");
                }}
                onDraftActivityChange={handleCaptureActivityChange}
              />
            </section>
          )}
        </div>
        </PanelCard>
      ) : null}
      {captureCompletion ? (
        <PanelCard
          variant="inset"
          className="border-primary/20 bg-gradient-to-b from-primary/[0.07] to-[hsl(var(--surface-inset))]"
        >
          <section className="space-y-5" role="status" aria-live="polite">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                {captureCompletion.kind === "note" ? (
                  <CircleCheck className="h-5 w-5" aria-hidden />
                ) : (
                  <FileCheck2 className="h-5 w-5" aria-hidden />
                )}
              </span>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Saved just now</p>
                <p className="text-base font-semibold text-foreground">
                  {captureCompletion.kind === "note" ? "Service note saved" : "Receipt saved"}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {captureCompletion.needsReview
                    ? "1 detail to confirm on Home."
                    : "Ready in this vehicle's maintenance history."}
                </p>
              </div>
            </div>
            <p className="rounded-lg border border-border/75 bg-background/65 px-3 py-2.5 text-sm leading-relaxed text-foreground">
              {captureCompletion.summary}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                onClick={() => {
                  setCaptureMode(captureCompletion.kind === "note" ? "note" : "photo");
                  setCaptureCompletion(null);
                }}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add another
              </Button>
              <Button asChild type="button" className="h-10 rounded-xl">
                <Link href={captureCompletion.needsReview ? "/?section=attention" : "/"}>
                  {captureCompletion.needsReview ? "Review on Home" : "Back to Home"}
                </Link>
              </Button>
            </div>
          </section>
        </PanelCard>
      ) : null}
      <p className="text-center text-xs text-muted-foreground">
        Text first. Photo when it matters.{" "}
        <Link href="/" className="underline-offset-2 hover:underline">
          Back to Home
        </Link>
      </p>
    </div>
  );
}
