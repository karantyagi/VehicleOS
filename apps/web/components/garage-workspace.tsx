"use client";

import { Plus } from "lucide-react";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DriverHabitsPanel } from "@/components/driver-habits-panel";
import { OwnerContextPanel } from "@/components/owner-context-panel";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { VehicleSettingsPanel } from "@/components/vehicle-settings-panel";
import { CAR_IDENTITY_NAV } from "@/lib/car-identity-nav";
import { useGarage } from "@/lib/garage/garage-context";
import { notify } from "@/lib/notify";
import { useAppUiStore } from "@/lib/store/app-ui-store";

function GarageWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const consoleMode = useAppUiStore((state) => state.consoleMode);
  const isDeveloper = consoleMode === "developer";
  const garage = useGarage();
  const vehicleId = garage.activeVehicleId;

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

      {activeTab === "car" ? (
        <div>
          <VehicleSettingsPanel vehicleId={vehicleId} minimal={!isDeveloper} />
        </div>
      ) : null}

      {activeTab === "driver" ? (
        <div className="space-y-6">
          <DriverHabitsPanel vehicleId={vehicleId} minimal={!isDeveloper} />
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
