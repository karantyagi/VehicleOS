"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DriverHabitsPanel } from "@/components/driver-habits-panel";
import { OwnerContextPanel } from "@/components/owner-context-panel";
import { PageHeader } from "@/components/page-header";
import { VehicleSettingsPanel } from "@/components/vehicle-settings-panel";
import { useAppUiStore } from "@/lib/store/app-ui-store";
import { cn } from "@/lib/utils";

export type GarageTab = "car" | "driver";

const GARAGE_TABS: { id: GarageTab; label: string }[] = [
  { id: "car", label: "Vehicle record" },
  { id: "driver", label: "Driving profile" },
];

function GarageWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const consoleMode = useAppUiStore((state) => state.consoleMode);
  const isDeveloper = consoleMode === "developer";
  const [vehicleId, setVehicleId] = useState<string | null>(null);

  const tabParam = searchParams.get("tab");
  const activeTab: GarageTab = tabParam === "driver" ? "driver" : "car";

  const setTab = useCallback(
    (tab: GarageTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`/garage?${params.toString()}`);
    },
    [router, searchParams],
  );

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
        title="Owner"
        description={isDeveloper ? "Vehicle record and driving profile — what the assistant keeps on file about the Owner." : undefined}
      />

      <div
        className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1"
        role="tablist"
        aria-label="Owner sections"
      >
        {GARAGE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setTab(tab.id)}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "car" ? (
        <div role="tabpanel">
          <VehicleSettingsPanel minimal={!isDeveloper} />
        </div>
      ) : null}

      {activeTab === "driver" ? (
        <div role="tabpanel" className="space-y-6">
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
