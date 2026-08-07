"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { Camera, CircleCheck, FileCheck2, FileText, Plus, Smartphone, WifiOff } from "lucide-react";
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
              <OwnerReceiptHandoff
                key={vehicle.id}
                vehicleId={vehicle.id}
                apiBase={apiBase}
                currentMileage={vehicle.currentMileage}
                disabled={!isOnline}
                onHandedOff={({ needsReview }) => {
                  setCaptureCompletion({
                    kind: "receipt",
                    needsReview,
                    summary: `Receipt saved for ${vehicleLabel}.`,
                  });
                  void reloadGarage();
                }}
                onError={(message) => notify(message, "error")}
              />
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
                <p className="text-base font-semibold text-foreground">
                  {captureCompletion.kind === "note" ? "Service note saved" : "Receipt saved"}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {captureCompletion.needsReview
                    ? "One detail needs your confirmation on Home."
                    : "It is now in this vehicle's maintenance history."}
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
