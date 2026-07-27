"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { DriverHabitsPanel } from "@/components/driver-habits-panel";
import { OwnerContextPanel } from "@/components/owner-context-panel";
import { PageHeader } from "@/components/page-header";
import { VehicleSettingsPanel } from "@/components/vehicle-settings-panel";
import { CAR_IDENTITY_NAV } from "@/lib/car-identity-nav";
import { useGarage } from "@/lib/garage/garage-context";
import { useAppUiStore } from "@/lib/store/app-ui-store";

function GarageWorkspaceContent() {
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

  return (
    <>
      <PageHeader
        eyebrow="Owner"
        title={pageMeta.label}
        description={isDeveloper ? pageMeta.description : undefined}
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
