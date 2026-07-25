"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { OwnerReceiptHandoff } from "@/components/owner-receipt-handoff";
import { PageHeader } from "@/components/page-header";
import { PanelCard } from "@/components/panel-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiBase } from "@/lib/api-base";
import { notify } from "@/lib/notify";
import { useAppUiStore } from "@/lib/store/app-ui-store";
import { useMediaQuery } from "@/lib/use-media-query";

type Vehicle = {
  id: string;
  year: number;
  make: string;
  model: string;
  currentMileage: number;
};

export function ReceiptCaptureWorkspace() {
  const apiBase = getApiBase();
  const isDeveloper = useAppUiStore((state) => state.consoleMode) === "developer";
  const isMobileViewport = useMediaQuery("(max-width: 768px)");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadVehicle = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/vehicles`);
      if (!response.ok) return;
      const body = (await response.json()) as { vehicles: Vehicle[] };
      setVehicle(body.vehicles[0] ?? null);
    } finally {
      setIsLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    void loadVehicle();
  }, [loadVehicle]);

  if (isLoading) {
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

  const vehicleLabel = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  if (!isDeveloper && !isMobileViewport) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <PageHeader
          eyebrow="Mobile capture"
          title="Snap on your phone"
          description={`Receipt intake for ${vehicleLabel} — not on desktop owner view.`}
        />
        <PanelCard variant="inset">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <Smartphone className="h-10 w-10 text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Open VehicleOS on your phone or add it to your home screen, then use the{" "}
              <strong className="font-medium text-foreground">Upload receipt</strong> shortcut.
            </p>
            <p className="text-xs text-muted-foreground">
              Verification and service history stay on this web workspace.
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
        title="Upload receipt"
        description={`Hand off a photo for ${vehicleLabel} — the assistant files it after ENG-2 extraction.`}
      />
      <PanelCard variant="inset">
        <OwnerReceiptHandoff
          vehicleId={vehicle.id}
          apiBase={apiBase}
          currentMileage={vehicle.currentMileage}
          onHandedOff={() => {
            notify("Receipt handed off — your assistant will file it.");
            void loadVehicle();
          }}
          onError={(message) => notify(message, "error")}
        />
      </PanelCard>
      <p className="text-center text-xs text-muted-foreground">
        <Link href="/" className="underline-offset-2 hover:underline">
          Back to reminders
        </Link>
      </p>
    </div>
  );
}
