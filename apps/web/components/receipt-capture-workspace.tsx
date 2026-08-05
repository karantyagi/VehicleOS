"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Camera, Mic, Smartphone } from "lucide-react";
import { OwnerReceiptHandoff } from "@/components/owner-receipt-handoff";
import { PageHeader } from "@/components/page-header";
import { PanelCard } from "@/components/panel-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VehicleGarageSwitcher } from "@/components/vehicle-garage-switcher";
import { getApiBase } from "@/lib/api-base";
import { useGarage } from "@/lib/garage/garage-context";
import { formatGarageVehicleLabel } from "@/lib/garage/types";
import { notify } from "@/lib/notify";
import { useAppUiStore } from "@/lib/store/app-ui-store";
import { useMediaQuery } from "@/lib/use-media-query";
import { VoiceMemoryPanel } from "@/components/voice-memory-panel";
import { cn } from "@/lib/utils";

export function ReceiptCaptureWorkspace() {
  const apiBase = getApiBase();
  const garage = useGarage();
  const isDeveloper = useAppUiStore((state) => state.consoleMode) === "developer";
  const isMobileViewport = useMediaQuery("(max-width: 768px)");
  const vehicle = garage.activeVehicle;
  const [captureMode, setCaptureMode] = useState<"photo" | "voice">("photo");
  const [needsWebReview, setNeedsWebReview] = useState(false);

  const reloadGarage = useCallback(async () => {
    await garage.refreshGarage();
  }, [garage]);

  useEffect(() => {
    if (!garage.isLoading && !vehicle && garage.vehicles.length > 0 && garage.activeVehicleId) {
      void garage.refreshGarage();
    }
  }, [garage, vehicle]);

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
      <PanelCard title="Receipt capture" description="Add a vehicle first, then snap receipts from your phone.">
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
          description={`Photo and voice intake for ${vehicleLabel} — not on the desktop owner view.`}
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
              Verification and service history stay on this web workspace — scoped to the selected vehicle.
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
        description={`Capture a receipt photo or voice note for ${vehicleLabel}.`}
        action={<VehicleGarageSwitcher compact />}
      />
      <PanelCard variant="inset">
        <div className="space-y-5">
          <div className="grid grid-cols-2 rounded-lg border border-border bg-muted/40 p-1" role="tablist" aria-label="Capture type">
            <Button
              type="button"
              role="tab"
              aria-selected={captureMode === "photo"}
              variant="ghost"
              className={cn(captureMode === "photo" && "bg-background shadow-sm")}
              onClick={() => setCaptureMode("photo")}
            >
              <Camera className="mr-1.5 h-4 w-4" aria-hidden />
              Photo
            </Button>
            <Button
              type="button"
              role="tab"
              aria-selected={captureMode === "voice"}
              variant="ghost"
              className={cn(captureMode === "voice" && "bg-background shadow-sm")}
              onClick={() => setCaptureMode("voice")}
            >
              <Mic className="mr-1.5 h-4 w-4" aria-hidden />
              Voice note
            </Button>
          </div>

          {captureMode === "photo" ? (
            <OwnerReceiptHandoff
              vehicleId={vehicle.id}
              apiBase={apiBase}
              currentMileage={vehicle.currentMileage}
              onHandedOff={({ needsReview }) => {
                setNeedsWebReview(needsReview);
                notify(
                  needsReview
                    ? "Receipt saved. Open Home on the web to review it."
                    : "Receipt saved to maintenance history.",
                );
                void reloadGarage();
              }}
              onError={(message) => notify(message, "error")}
            />
          ) : (
            <VoiceMemoryPanel
              vehicleId={vehicle.id}
              apiBase={apiBase}
              defaultMileage={vehicle.currentMileage}
              minimal
              onSubmitted={(body) => {
                setNeedsWebReview(body.conflict === true);
                notify(
                  body.conflict
                    ? "Voice note saved. Open Home on the web to verify one detail."
                    : "Voice note saved to maintenance history.",
                );
                void reloadGarage();
              }}
              onError={(message) => {
                if (message) notify(message, "error");
              }}
            />
          )}
        </div>
      </PanelCard>
      {needsWebReview ? (
        <PanelCard
          variant="inset"
          title="Review needed"
          description="The record is saved. The assistant found one detail that needs your confirmation on the web."
        >
          <Button asChild type="button" size="sm">
            <Link href="/?section=attention">Review in Your attention</Link>
          </Button>
        </PanelCard>
      ) : null}
      <p className="text-center text-xs text-muted-foreground">
        <Link href="/" className="underline-offset-2 hover:underline">
          Back to Home
        </Link>
      </p>
    </div>
  );
}
