"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { MaintenanceDeviationReasonId } from "@vehicleos/domain";

const REASON_OPTIONS: { id: MaintenanceDeviationReasonId; label: string }[] = [
  { id: "winter_salt", label: "Winter road salt / corrosion" },
  { id: "noise_symptom", label: "Noise or symptom appeared" },
  { id: "dealer_recommended", label: "Shop or dealer recommended early" },
  { id: "aggressive_driving", label: "Aggressive or sporty driving" },
  { id: "deferred_intentionally", label: "Deferred intentionally last time" },
  { id: "other", label: "Other — I'll explain later" },
];

type DeviationPatternFormProps = {
  vehicleId: string;
  taskId: string;
  apiBase: string;
  disabled?: boolean;
  suggestedReasonId?: MaintenanceDeviationReasonId | null;
  draftReasonSource?: "heuristic" | "llm" | null;
  onConfirmed: () => void;
  onError: (message: string) => void;
};

export function DeviationPatternForm({
  vehicleId,
  taskId,
  apiBase,
  disabled = false,
  suggestedReasonId = null,
  draftReasonSource = null,
  onConfirmed,
  onError,
}: DeviationPatternFormProps) {
  const [selectedReason, setSelectedReason] = useState<MaintenanceDeviationReasonId | null>(
    suggestedReasonId,
  );
  const [isSaving, setIsSaving] = useState(false);

  const confirm = async () => {
    if (!selectedReason) {
      onError("Pick a reason so your assistant can remember this pattern.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${apiBase}/api/tasks/${taskId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          decision: "approve",
          maintenancePatternReason: selectedReason,
        }),
      });
      if (!response.ok) {
        onError("Could not save your pattern.");
        return;
      }
      onConfirmed();
    } catch {
      onError("Could not save your pattern.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
      {suggestedReasonId ? (
        <p className="text-xs text-muted-foreground">
          Assistant suggestion
          {draftReasonSource === "llm" ? " (AI)" : ""}
          {" — "}
          pre-selected below. Change it if this doesn&apos;t fit.
        </p>
      ) : null}
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Why did timing differ from the OEM interval?
      </p>
      <div className="flex flex-wrap gap-2">
        {REASON_OPTIONS.map((option) => (
          <Button
            key={option.id}
            type="button"
            size="sm"
            variant={selectedReason === option.id ? "default" : "secondary"}
            disabled={disabled || isSaving}
            onClick={() => setSelectedReason(option.id)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      <Button type="button" size="sm" disabled={disabled || isSaving || !selectedReason} onClick={() => void confirm()}>
        {isSaving ? "Saving…" : "Remember this pattern"}
      </Button>
    </div>
  );
}
