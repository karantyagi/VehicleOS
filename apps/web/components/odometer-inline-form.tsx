"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OdometerInlineFormProps = {
  vehicleId: string;
  apiBase: string;
  defaultMileage: number;
  disabled?: boolean;
  onSaved: () => void;
  onError: (message: string) => void;
};

export function OdometerInlineForm({
  vehicleId,
  apiBase,
  defaultMileage,
  disabled = false,
  onSaved,
  onError,
}: OdometerInlineFormProps) {
  const [mileage, setMileage] = useState(String(defaultMileage));
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    const nextMileage = Number(mileage);
    if (!Number.isFinite(nextMileage) || nextMileage <= 0) {
      onError("Enter a valid odometer reading.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentMileage: nextMileage }),
      });
      if (!response.ok) {
        onError("Could not update mileage.");
        return;
      }
      onSaved();
    } catch {
      onError("Could not update mileage.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <Label htmlFor="odometer-inline" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Current odometer
      </Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id="odometer-inline"
          type="number"
          inputMode="numeric"
          value={mileage}
          disabled={disabled || isSaving}
          onChange={(event) => setMileage(event.target.value)}
          className="max-w-[10rem] tabular-nums"
        />
        <Button type="button" size="sm" disabled={disabled || isSaving} onClick={() => void save()}>
          {isSaving ? "Saving…" : "Update mileage"}
        </Button>
      </div>
    </div>
  );
}
