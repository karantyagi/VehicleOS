"use client";

import { useCallback, useEffect, useState } from "react";
import { FormActions, FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export type ClimateZone = "cold" | "moderate" | "hot";

type SeasonalPromptsPanelProps = {
  vehicleId: string;
  apiBase: string;
  disabled?: boolean;
  onRefreshed: (body: { nowQueue: unknown[]; created: { title: string }[] }) => void;
  onError: (message: string) => void;
};

const CLIMATE_OPTIONS: { value: ClimateZone; label: string }[] = [
  { value: "cold", label: "Cold winters (snow / freeze)" },
  { value: "moderate", label: "Moderate seasons" },
  { value: "hot", label: "Hot summers" },
];

export function SeasonalPromptsPanel({
  vehicleId,
  apiBase,
  disabled = false,
  onRefreshed,
  onError,
}: SeasonalPromptsPanelProps) {
  const [climateZone, setClimateZone] = useState<ClimateZone>("moderate");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastCreatedCount, setLastCreatedCount] = useState(0);

  const refreshPrompts = useCallback(async () => {
    setIsRefreshing(true);
    onError("");

    try {
      const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/seasonal/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ climateZone }),
      });

      const body = (await response.json()) as {
        nowQueue: unknown[];
        created: { title: string }[];
        error?: string;
      };

      if (!response.ok) throw new Error(body.error ?? "Seasonal refresh failed");

      setLastCreatedCount(body.created.length);
      onRefreshed(body);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Seasonal refresh failed.");
    } finally {
      setIsRefreshing(false);
    }
  }, [apiBase, climateZone, onError, onRefreshed, vehicleId]);

  useEffect(() => {
    void refreshPrompts();
  }, [vehicleId, climateZone]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Rules-driven seasonal nudges for your driving context — not a weather app.
      </p>

      <FormField label="Driving context" htmlFor="climate-zone">
        <Select
          id="climate-zone"
          value={climateZone}
          disabled={disabled || isRefreshing}
          onChange={(event) => setClimateZone(event.target.value as ClimateZone)}
        >
          {CLIMATE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormActions>
        <Button type="button" disabled={disabled || isRefreshing} onClick={() => void refreshPrompts()}>
          {isRefreshing ? "Checking seasonal prompts…" : "Refresh seasonal prompts"}
        </Button>
      </FormActions>

      <p className="text-xs text-muted-foreground">
        {lastCreatedCount > 0
          ? `${lastCreatedCount} seasonal prompt(s) added to your Now queue.`
          : "No new seasonal prompts right now — check back next season or after a refresh."}
      </p>
    </div>
  );
}
