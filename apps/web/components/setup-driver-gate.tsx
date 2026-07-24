"use client";

import { useState } from "react";
import { DrivingStyleFields } from "@/components/driving-style-fields";
import { FormActions } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  loadDriverHabits,
  parseStatedMilesPerYear,
  saveDriverHabits,
  type DriverHabitsDraft,
} from "@/lib/driver-habits";
import { notify } from "@/lib/notify";

type SetupDriverGateProps = {
  vehicleId: string;
  vehicleLabel: string;
  onComplete: () => void;
};

export function SetupDriverGate({ vehicleId, vehicleLabel, onComplete }: SetupDriverGateProps) {
  const [draft, setDraft] = useState<DriverHabitsDraft>(() => loadDriverHabits(vehicleId));
  const [milesInput, setMilesInput] = useState(() => {
    const loaded = loadDriverHabits(vehicleId);
    return loaded.statedMilesPerYear ? String(loaded.statedMilesPerYear) : "";
  });

  const saveAndContinue = () => {
    const parsedMiles = parseStatedMilesPerYear(milesInput);
    if (parsedMiles === "invalid") {
      notify("Enter annual mileage between 1,000 and 80,000.", "error");
      return;
    }
    const next: DriverHabitsDraft = {
      drivingStyle: draft.drivingStyle,
      statedMilesPerYear: parsedMiles,
    };
    saveDriverHabits(vehicleId, next);
    onComplete();
  };

  return (
    <Card className="overflow-hidden border-border/80 shadow-md">
      <div className="h-1 bg-muted">
        <div className="h-full w-2/3 bg-primary transition-all duration-300" />
      </div>
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Setup · Step 2 of 2</p>
        <CardTitle>Driving profile</CardTitle>
        <CardDescription>
          One more step before the assistant workspace unlocks. Your {vehicleLabel} is on file — add the Owner&apos;s
          driving profile so Schedule and reminders can pace recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <DrivingStyleFields
          draft={draft}
          milesInput={milesInput}
          onDraftChange={setDraft}
          onMilesInputChange={setMilesInput}
        />
        <FormActions>
          <Button type="button" onClick={saveAndContinue}>
            Finish setup
          </Button>
        </FormActions>
      </CardContent>
    </Card>
  );
}
