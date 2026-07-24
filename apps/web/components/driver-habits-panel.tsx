"use client";

import { useEffect, useState } from "react";
import { DrivingStyleFields } from "@/components/driving-style-fields";
import { Button } from "@/components/ui/button";
import { PanelCard } from "@/components/panel-card";
import {
  parseStatedMilesPerYear,
  patchVehicleProfile,
  vehicleProfileFromRecord,
  type DriverHabitsDraft,
  type VehicleOwnerProfile,
} from "@/lib/driver-habits";
import { notify } from "@/lib/notify";

export type { DriverHabitsDraft, DrivingStyle } from "@/lib/driver-habits";

type DriverHabitsPanelProps = {
  vehicleId: string | null;
  minimal?: boolean;
};

export function DriverHabitsPanel({ vehicleId, minimal = false }: DriverHabitsPanelProps) {
  const [draft, setDraft] = useState<DriverHabitsDraft>({
    drivingStyle: "casual",
    statedMilesPerYear: null,
  });
  const [milesInput, setMilesInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!vehicleId) {
      setIsLoading(false);
      return;
    }

    void (async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/vehicles");
        const body = (await response.json()) as { vehicles?: VehicleOwnerProfile[]; error?: string };
        if (!response.ok) throw new Error(body.error ?? "Could not load vehicle");
        const vehicle = body.vehicles?.find((entry) => entry.id === vehicleId) ?? null;
        const loaded = vehicleProfileFromRecord(vehicle);
        setDraft(loaded);
        setMilesInput(loaded.statedMilesPerYear ? String(loaded.statedMilesPerYear) : "");
      } catch (loadError) {
        notify(loadError instanceof Error ? loadError.message : "Could not load driver profile", "error");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [vehicleId]);

  const saveDraft = async () => {
    if (!vehicleId) {
      notify("Add a vehicle first.", "error");
      return;
    }

    const parsedMiles = parseStatedMilesPerYear(milesInput);
    if (parsedMiles === "invalid") {
      notify("Enter annual mileage between 1,000 and 80,000.", "error");
      return;
    }

    setIsSaving(true);
    try {
      await patchVehicleProfile(vehicleId, {
        drivingStyle: draft.drivingStyle,
        statedMilesPerYear: parsedMiles,
      });
      setDraft({
        drivingStyle: draft.drivingStyle,
        statedMilesPerYear: parsedMiles,
      });
      notify("Driving profile saved.", "success");
    } catch (saveError) {
      notify(saveError instanceof Error ? saveError.message : "Save failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PanelCard
      hideHeader={minimal}
      title="Driving profile"
      description="How you drive shapes preemptive recommendations — not OEM due dates."
    >
      {!minimal ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Schedule dates assume 10,000 mi/year unless you set annual mileage or we learn from receipts.
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading driving profile…</p>
      ) : (
        <>
          <DrivingStyleFields
            draft={draft}
            milesInput={milesInput}
            onDraftChange={setDraft}
            onMilesInputChange={setMilesInput}
          />

          <Button type="button" onClick={() => void saveDraft()} disabled={!vehicleId || isSaving}>
            {isSaving ? "Saving…" : "Save driving profile"}
          </Button>
        </>
      )}
    </PanelCard>
  );
}
