"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const dismissStorageKey = (vehicleId: string): string => `vehicleos:import-history-nudge:dismissed:${vehicleId}`;

type ImportHistoryNudgeProps = {
  vehicleId: string;
  timelineEmpty: boolean;
  onImport: () => void;
};

export function ImportHistoryNudge({ vehicleId, timelineEmpty, onImport }: ImportHistoryNudgeProps) {
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsDismissed(window.localStorage.getItem(dismissStorageKey(vehicleId)) === "1");
  }, [vehicleId]);

  if (!timelineEmpty || isDismissed) return null;

  const dismiss = (): void => {
    window.localStorage.setItem(dismissStorageKey(vehicleId), "1");
    setIsDismissed(true);
  };

  return (
    <Alert className="flex flex-col gap-3 border-primary/20 bg-primary/5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-foreground">
        Schedule is live — add CARFAX from Import history to sharpen dates.
      </p>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button type="button" size="sm" onClick={onImport}>
          Import history
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
          Not now
        </Button>
      </div>
    </Alert>
  );
}
