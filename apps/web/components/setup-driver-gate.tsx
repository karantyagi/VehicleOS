"use client";

import { useState } from "react";
import { DrivingStyleFields } from "@/components/driving-style-fields";
import { FormActions } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildOwnerContextWithPrimaryCity,
  parseStatedMilesPerYear,
  patchVehicleProfile,
  type DriverHabitsDraft,
} from "@/lib/driver-habits";
import { notify } from "@/lib/notify";

type SetupDriverGateProps = {
  vehicleId: string;
  vehicleLabel: string;
  onComplete: () => void;
};

export function SetupDriverGate({ vehicleId, vehicleLabel, onComplete }: SetupDriverGateProps) {
  const [draft, setDraft] = useState<DriverHabitsDraft>({
    drivingStyle: "casual",
    statedMilesPerYear: null,
    primaryCity: "",
  });
  const [milesInput, setMilesInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const saveAndContinue = async () => {
    const parsedMiles = parseStatedMilesPerYear(milesInput);
    if (parsedMiles === "invalid") {
      notify("Annual miles: 1,000–80,000.", "error");
      return;
    }

    setIsSaving(true);
    try {
      await patchVehicleProfile(vehicleId, {
        drivingStyle: draft.drivingStyle,
        statedMilesPerYear: parsedMiles,
        ownerContextMemory: buildOwnerContextWithPrimaryCity(null, draft.primaryCity),
      });
      onComplete();
    } catch (saveError) {
      notify(saveError instanceof Error ? saveError.message : "Save failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="overflow-hidden border-border/80 shadow-md">
      <div className="h-1 bg-muted">
        <div className="h-full w-full bg-primary transition-all duration-300" />
      </div>
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Finish setup</p>
        <CardTitle>Your driving profile</CardTitle>
        <CardDescription>
          {vehicleLabel} is saved — home city unlocks calendar reminders.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <DrivingStyleFields
          variant="onboarding"
          draft={draft}
          milesInput={milesInput}
          onDraftChange={setDraft}
          onMilesInputChange={setMilesInput}
        />
        <FormActions>
          <Button type="button" disabled={isSaving || !draft.primaryCity.trim()} onClick={() => void saveAndContinue()}>
            {isSaving ? "Saving…" : "Unlock reminders"}
          </Button>
        </FormActions>
      </CardContent>
    </Card>
  );
}
