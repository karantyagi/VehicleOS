"use client";

import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_MILES_PER_YEAR,
  DRIVING_STYLE_OPTIONS,
  type DriverHabitsDraft,
  type DrivingStyle,
} from "@/lib/driver-habits";
import { cn } from "@/lib/utils";

type DrivingStyleFieldsProps = {
  draft: DriverHabitsDraft;
  milesInput: string;
  onDraftChange: (draft: DriverHabitsDraft) => void;
  onMilesInputChange: (value: string) => void;
  compact?: boolean;
};

export function DrivingStyleFields({
  draft,
  milesInput,
  onDraftChange,
  onMilesInputChange,
  compact = false,
}: DrivingStyleFieldsProps) {
  const effectiveMiles =
    draft.statedMilesPerYear && draft.statedMilesPerYear > 0
      ? draft.statedMilesPerYear
      : DEFAULT_MILES_PER_YEAR;

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {!compact ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Schedule date math uses <strong>{DEFAULT_MILES_PER_YEAR.toLocaleString()} mi/year</strong> until you
          override below.
        </p>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Driving style</legend>
        {DRIVING_STYLE_OPTIONS.map((option) => {
          const selected = draft.drivingStyle === option.id;
          return (
            <label
              key={option.id}
              className={cn(
                "flex cursor-pointer gap-3 rounded-lg border px-3 py-3 transition-colors",
                selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
              )}
            >
              <input
                type="radio"
                name="driving-style"
                className="mt-1"
                checked={selected}
                onChange={() => onDraftChange({ ...draft, drivingStyle: option.id as DrivingStyle })}
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <FormField
        label="Annual miles (optional)"
        htmlFor="stated-miles-per-year"
        hint={`≈ ${Math.round(effectiveMiles / 12).toLocaleString()} mi/month at current estimate`}
      >
        <Input
          id="stated-miles-per-year"
          type="number"
          min={1000}
          max={80000}
          placeholder={String(DEFAULT_MILES_PER_YEAR)}
          value={milesInput}
          onChange={(event) => {
            onMilesInputChange(event.target.value);
            const trimmed = event.target.value.trim();
            onDraftChange({
              ...draft,
              statedMilesPerYear: trimmed ? Number(trimmed) : null,
            });
          }}
        />
      </FormField>
    </div>
  );
}
