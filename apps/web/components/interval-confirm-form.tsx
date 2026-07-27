"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type IntervalConfirmFormProps = {
  vehicleId: string;
  taskId: string;
  apiBase: string;
  disabled?: boolean;
  suggestedIntervalMiles?: number | null;
  suggestedIntervalMonths?: number | null;
  onConfirmed: () => void;
  onDismiss: () => void;
  onError: (message: string) => void;
};

export function IntervalConfirmForm({
  vehicleId,
  taskId,
  apiBase,
  disabled = false,
  suggestedIntervalMiles = null,
  suggestedIntervalMonths = null,
  onConfirmed,
  onDismiss,
  onError,
}: IntervalConfirmFormProps) {
  const [intervalMiles, setIntervalMiles] = useState(
    suggestedIntervalMiles !== null && suggestedIntervalMiles !== undefined
      ? String(suggestedIntervalMiles)
      : "",
  );
  const [intervalMonths, setIntervalMonths] = useState(
    suggestedIntervalMonths !== null && suggestedIntervalMonths !== undefined
      ? String(suggestedIntervalMonths)
      : "",
  );
  const [isSaving, setIsSaving] = useState(false);

  const hasMilesField = suggestedIntervalMiles !== null && suggestedIntervalMiles !== undefined;
  const hasMonthsField = suggestedIntervalMonths !== null && suggestedIntervalMonths !== undefined;

  const parsedMiles = useMemo(() => {
    const value = intervalMiles.trim();
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [intervalMiles]);

  const parsedMonths = useMemo(() => {
    const value = intervalMonths.trim();
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [intervalMonths]);

  const confirm = async () => {
    const miles = hasMilesField ? parsedMiles : null;
    const months = hasMonthsField ? parsedMonths : null;

    if (miles === null && months === null) {
      onError("Enter a valid interval before confirming.");
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
          ownerIntervalOverlay: {
            intervalMiles: miles,
            intervalMonths: months,
          },
        }),
      });
      if (!response.ok) {
        onError("Could not save your interval.");
        return;
      }
      onConfirmed();
    } catch {
      onError("Could not save your interval.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Your maintenance cadence
      </p>
      <p className="text-xs text-muted-foreground">
        You confirmed — we&apos;ll use your interval for reminders. The OEM schedule stays on file for reference.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {hasMilesField ? (
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Miles between services</span>
            <Input
              inputMode="numeric"
              value={intervalMiles}
              disabled={disabled || isSaving}
              onChange={(event) => setIntervalMiles(event.target.value.replace(/[^\d]/g, ""))}
            />
          </label>
        ) : null}
        {hasMonthsField ? (
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Months between services</span>
            <Input
              inputMode="numeric"
              value={intervalMonths}
              disabled={disabled || isSaving}
              onChange={(event) => setIntervalMonths(event.target.value.replace(/[^\d]/g, ""))}
            />
          </label>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={disabled || isSaving} onClick={() => void confirm()}>
          {isSaving ? "Saving…" : "Yes — remind me on my schedule"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled || isSaving}
          onClick={onDismiss}
        >
          Keep OEM interval
        </Button>
      </div>
    </div>
  );
}
