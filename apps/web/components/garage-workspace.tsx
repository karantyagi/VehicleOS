"use client";

import { Plus } from "lucide-react";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DriverHabitsPanel } from "@/components/driver-habits-panel";
import { OwnerContextPanel } from "@/components/owner-context-panel";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VehicleSettingsPanel } from "@/components/vehicle-settings-panel";
import { CAR_IDENTITY_NAV } from "@/lib/car-identity-nav";
import { useGarage } from "@/lib/garage/garage-context";
import { notify } from "@/lib/notify";
import { useAppUiStore } from "@/lib/store/app-ui-store";

function ProfileLoadingSkeleton({ label }: { label: string }) {
  return (
    <div className="surface-panel space-y-5 rounded-xl border border-border/80 p-6" aria-busy="true" aria-label={`Loading ${label}`}>
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

function GarageWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const consoleMode = useAppUiStore((state) => state.consoleMode);
  const isDeveloper = consoleMode === "developer";
  const garage = useGarage();
  const vehicleId = garage.activeVehicleId;
  const isInitialGarageLoad = garage.isLoading && garage.vehicles.length === 0;

  const activeTab = searchParams.get("tab") === "driver" ? "driver" : "car";
  const pageMeta = CAR_IDENTITY_NAV.find((item) => item.id === activeTab) ?? CAR_IDENTITY_NAV[0];

  useEffect(() => {
    document.title = `${pageMeta.label} · VehicleOS`;
  }, [pageMeta.label]);

  const addVehicle = () => {
    const result = garage.startAddVehicle();
    if (!result.ok) {
      notify(result.reason, "error");
      return;
    }
    router.push("/?addVehicle=1");
  };

  return (
    <>
      <PageHeader
        eyebrow="Owner"
        title={pageMeta.label}
        description={isDeveloper ? pageMeta.description : undefined}
        action={
          activeTab === "car" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 px-0 text-primary sm:w-auto sm:px-3"
              aria-label="Add vehicle"
              disabled={garage.isLoading}
              onClick={addVehicle}
            >
              <Plus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Add vehicle</span>
            </Button>
          ) : undefined
        }
        className="flex-row items-start justify-between"
      />

      {isInitialGarageLoad ? <ProfileLoadingSkeleton label={pageMeta.label} /> : null}

      {!isInitialGarageLoad && activeTab === "car" ? (
        <div>
          <VehicleSettingsPanel
            key={vehicleId ?? "no-vehicle"}
            vehicle={garage.activeVehicle}
            minimal={!isDeveloper}
            onVehicleUpdated={garage.refreshGarage}
          />
        </div>
      ) : null}

      {!isInitialGarageLoad && activeTab === "driver" ? (
        <div className="space-y-6">
          <DriverHabitsPanel
            key={vehicleId ?? "no-vehicle"}
            vehicle={garage.activeVehicle}
            minimal={!isDeveloper}
            onVehicleUpdated={garage.refreshGarage}
          />
          {isDeveloper ? <OwnerContextPanel vehicleId={vehicleId} /> : null}
        </div>
      ) : null}
    </>
  );
}

export function GarageWorkspace() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <GarageWorkspaceContent />
    </Suspense>
  );
}
