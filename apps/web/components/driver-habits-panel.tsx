"use client";

import { useEffect, useState } from "react";
import { DrivingStyleFields } from "@/components/driving-style-fields";
import { Button } from "@/components/ui/button";
import { PanelCard } from "@/components/panel-card";
import {
  loadDriverHabits,
  parseStatedMilesPerYear,
  saveDriverHabits,
  type DriverHabitsDraft,
} from "@/lib/driver-habits";
import { notify } from "@/lib/notify";

export type { DriverHabitsDraft, DrivingStyle } from "@/lib/driver-habits";

type DriverHabitsPanelProps = {
  vehicleId: string | null;
};

export function DriverHabitsPanel({ vehicleId }: DriverHabitsPanelProps) {
  const [draft, setDraft] = useState<DriverHabitsDraft>({
    drivingStyle: "casual",
    statedMilesPerYear: null,
  });
  const [milesInput, setMilesInput] = useState("");

  useEffect(() => {
    const loaded = loadDriverHabits(vehicleId);
    setDraft(loaded);
    setMilesInput(loaded.statedMilesPerYear ? String(loaded.statedMilesPerYear) : "");
  }, [vehicleId]);

  const saveDraft = () => {
    if (!vehicleId) {
      notify("Add a vehicle first.", "error");
      return;
    }
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
    setDraft(next);
    notify("Driver habits saved on this device.", "success");
  };

  return (
    <PanelCard
      title="Driver habits"
      description="How you drive shapes preemptive recommendations — not OEM due dates."
    >
      <p className="text-xs leading-relaxed text-muted-foreground">
        Account sync across devices ships in SCH-2.
      </p>

      <DrivingStyleFields
        draft={draft}
        milesInput={milesInput}
        onDraftChange={setDraft}
        onMilesInputChange={setMilesInput}
      />

      <Button type="button" onClick={saveDraft} disabled={!vehicleId}>
        Save driver habits
      </Button>
    </PanelCard>
  );
}
