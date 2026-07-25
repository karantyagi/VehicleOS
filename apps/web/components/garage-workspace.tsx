"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DriverHabitsPanel } from "@/components/driver-habits-panel";
import { OwnerContextPanel } from "@/components/owner-context-panel";
import { PageHeader } from "@/components/page-header";
import { VehicleSettingsPanel } from "@/components/vehicle-settings-panel";
import { CAR_IDENTITY_NAV } from "@/lib/car-identity-nav";
import { useAppUiStore } from "@/lib/store/app-ui-store";

function GarageWorkspaceContent() {
  const searchParams = useSearchParams();
  const consoleMode = useAppUiStore((state) => state.consoleMode);
  const isDeveloper = consoleMode === "developer";
  const [vehicleId, setVehicleId] = useState<string | null>(null);

  const activeTab = searchParams.get("tab") === "driver" ? "driver" : "car";
  const pageMeta = CAR_IDENTITY_NAV.find((item) => item.id === activeTab) ?? CAR_IDENTITY_NAV[0];

  useEffect(() => {
    document.title = `${pageMeta.label} · VehicleOS`;
  }, [pageMeta.label]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/vehicles");
        const body = (await response.json()) as { vehicles?: { id: string }[] };
        setVehicleId(body.vehicles?.[0]?.id ?? null);
      } catch {
        setVehicleId(null);
      }
    })();
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Owner"
        title={pageMeta.label}
        description={isDeveloper ? pageMeta.description : undefined}
      />

      {activeTab === "car" ? (
        <div>
          <VehicleSettingsPanel minimal={!isDeveloper} />
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
