"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

type TireRotationConditionId =
  | "uneven_tread"
  | "pressure_or_tpms"
  | "pull_vibration_or_cupping"
  | "special_tire_setup";

const TIRE_ROTATION_CONDITIONS: {
  id: TireRotationConditionId;
  label: string;
}[] = [
  { id: "uneven_tread", label: "Uneven tread wear" },
  { id: "pressure_or_tpms", label: "Low pressure or TPMS alert" },
  { id: "pull_vibration_or_cupping", label: "Pull, vibration, or cupping" },
  { id: "special_tire_setup", label: "Directional, staggered, or mixed tire setup" },
];

type IntervalConfirmFormProps = {
  vehicleId: string;
  taskId: string;
  apiBase: string;
  disabled?: boolean;
  suggestedIntervalMiles?: number | null;
  suggestedIntervalMonths?: number | null;
  intervalKind?: "general" | "tire_rotation";
  dismissLabel?: string;
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
  intervalKind = "general",
  dismissLabel = "Keep OEM interval",
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
  const [tireRotationConditions, setTireRotationConditions] = useState<
    TireRotationConditionId[]
  >([]);

  const hasMilesField = suggestedIntervalMiles !== null && suggestedIntervalMiles !== undefined;
  const hasMonthsField =
    intervalKind !== "tire_rotation" &&
    suggestedIntervalMonths !== null &&
    suggestedIntervalMonths !== undefined;

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
            basis:
              intervalKind === "tire_rotation"
                ? "mileage"
                : miles !== null && months !== null
                  ? "mixed"
                  : miles !== null
                    ? "mileage"
                    : "time",
            tireRotationConditions:
              intervalKind === "tire_rotation" ? tireRotationConditions : undefined,
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
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {intervalKind === "tire_rotation"
          ? "Suggested mileage interval"
          : "Your maintenance cadence"}
      </p>
      <p className="text-xs text-muted-foreground">
        {intervalKind === "tire_rotation"
          ? "Based on your documented rotation history. Edit the average before saving; OEM guidance stays on file for reference."
          : "Review the assistant suggestion before saving. The OEM schedule stays on file for reference."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {hasMilesField ? (
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">
              {intervalKind === "tire_rotation"
                ? "Miles between rotations"
                : "Miles between services"}
            </span>
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
      {intervalKind === "tire_rotation" ? (
        <details className="rounded-md border border-border bg-background px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">
            Anything that means inspect sooner?
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {TIRE_ROTATION_CONDITIONS.map((condition) => (
              <label key={condition.id} className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={tireRotationConditions.includes(condition.id)}
                  disabled={disabled || isSaving}
                  onCheckedChange={(checked) =>
                    setTireRotationConditions((current) =>
                      checked === true
                        ? [...new Set([...current, condition.id])]
                        : current.filter((item) => item !== condition.id),
                    )
                  }
                />
                <span>{condition.label}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            These are saved as inspect-sooner context. They do not silently change your mileage interval.
          </p>
        </details>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={disabled || isSaving} onClick={() => void confirm()}>
          {isSaving
            ? "Saving..."
            : intervalKind === "tire_rotation"
              ? "Use this mileage"
              : "Use this interval"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled || isSaving}
          onClick={onDismiss}
        >
          {dismissLabel}
        </Button>
      </div>
    </div>
  );
}
