"use client";

import { useState } from "react";
import { DrivingStyleFields } from "@/components/driving-style-fields";
import { Button } from "@/components/ui/button";
import { PanelCard } from "@/components/panel-card";
import {
  buildOwnerContextWithPrimaryCity,
  DEFAULT_MILES_PER_YEAR,
  drivingStyleLabel,
  parseStatedMilesPerYear,
  patchVehicleProfile,
  STATED_MILES_INVALID_MESSAGE,
  STATED_MILES_REQUIRED_MESSAGE,
  vehicleProfileFromRecord,
  type DriverHabitsDraft,
} from "@/lib/driver-habits";
import type { GarageVehicleSummary } from "@/lib/garage/types";
import { notify } from "@/lib/notify";

export type { DriverHabitsDraft, DrivingStyle } from "@/lib/driver-habits";

type DriverHabitsPanelProps = {
  vehicle: GarageVehicleSummary | null;
  minimal?: boolean;
  onVehicleUpdated?: () => Promise<void>;
};

const profileDraft = (vehicle: GarageVehicleSummary | null): DriverHabitsDraft =>
  vehicleProfileFromRecord(vehicle);

export function DriverHabitsPanel({ vehicle, minimal = false, onVehicleUpdated }: DriverHabitsPanelProps) {
  const [draft, setDraft] = useState<DriverHabitsDraft>(() => profileDraft(vehicle));
  const [existingContext, setExistingContext] = useState(() => vehicle?.ownerContextMemory ?? null);
  const [milesInput, setMilesInput] = useState(() =>
    draft.statedMilesPerYear ? String(draft.statedMilesPerYear) : "",
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = () => {
    const nextDraft = profileDraft(vehicle);
    setDraft(nextDraft);
    setExistingContext(vehicle?.ownerContextMemory ?? null);
    setMilesInput(nextDraft.statedMilesPerYear ? String(nextDraft.statedMilesPerYear) : "");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    startEditing();
    setIsEditing(false);
  };

  const saveDraft = async () => {
    if (!vehicle) {
      notify("Add a vehicle first.", "error");
      return;
    }

    if (!draft.primaryCity.trim()) {
      notify("Home city is required - it anchors seasonal planning and shop lookups.", "error");
      return;
    }

    const parsedMiles = parseStatedMilesPerYear(milesInput);
    if (parsedMiles === null) {
      notify(STATED_MILES_REQUIRED_MESSAGE, "error");
      return;
    }
    if (parsedMiles === "invalid") {
      notify(STATED_MILES_INVALID_MESSAGE, "error");
      return;
    }

    setIsSaving(true);
    try {
      const nextContext = buildOwnerContextWithPrimaryCity(existingContext, draft.primaryCity);
      await patchVehicleProfile(vehicle.id, {
        drivingStyle: draft.drivingStyle,
        statedMilesPerYear: parsedMiles,
        ownerContextMemory: nextContext,
      });
      setExistingContext(nextContext);
      setDraft({
        drivingStyle: draft.drivingStyle,
        statedMilesPerYear: parsedMiles,
        primaryCity: draft.primaryCity.trim(),
      });
      setMilesInput(String(parsedMiles));
      await onVehicleUpdated?.();
      setIsEditing(false);
      notify("Driving profile saved.", "success");
    } catch (saveError) {
      notify(saveError instanceof Error ? saveError.message : "Save failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!vehicle) {
    return (
      <PanelCard
        hideHeader={minimal}
        title="Driving profile"
        description="Add a vehicle before setting how you drive."
      >
        <p className="text-sm text-muted-foreground">No vehicle on file yet.</p>
      </PanelCard>
    );
  }

  const annualMiles = draft.statedMilesPerYear ?? DEFAULT_MILES_PER_YEAR;
  const profileComplete = Boolean(draft.primaryCity.trim() && draft.statedMilesPerYear);

  return (
    <PanelCard
      hideHeader={minimal}
      title="Driving profile"
      description="Your normal driving and home city shape proactive guidance - not OEM due dates."
    >
      {isEditing ? (
        <>
          <DrivingStyleFields
            draft={draft}
            milesInput={milesInput}
            onDraftChange={setDraft}
            onMilesInputChange={setMilesInput}
          />

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void saveDraft()} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save driving profile"}
            </Button>
            <Button type="button" variant="ghost" onClick={cancelEditing} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">Your driving profile</p>
              <p className="text-sm text-muted-foreground">
                {profileComplete
                  ? "Used to tailor attention windows and local guidance."
                  : "Add the last two details to personalize future guidance."}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={startEditing}>
              {profileComplete ? "Edit driving profile" : "Set up driving profile"}
            </Button>
          </div>

          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
              <dt className="text-xs font-medium text-muted-foreground">Driving style</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{drivingStyleLabel(draft.drivingStyle)}</dd>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
              <dt className="text-xs font-medium text-muted-foreground">Home city</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{draft.primaryCity || "Not set"}</dd>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
              <dt className="text-xs font-medium text-muted-foreground">Annual miles</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{annualMiles.toLocaleString()} mi/year</dd>
            </div>
          </dl>
        </div>
      )}
    </PanelCard>
  );
}
