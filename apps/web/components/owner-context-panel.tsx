"use client";

import { useEffect, useState } from "react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PanelCard } from "@/components/panel-card";
import { Textarea } from "@/components/ui/textarea";
import { patchVehicleProfile, type VehicleOwnerProfile } from "@/lib/driver-habits";
import {
  draftFromOwnerContext,
  ownerContextFromDraft,
  type OwnerContextDraft,
  type OwnerContextMemory,
} from "@/lib/owner-context";
import { notify } from "@/lib/notify";

type OwnerContextPanelProps = {
  vehicleId: string | null;
};

export function OwnerContextPanel({ vehicleId }: OwnerContextPanelProps) {
  const [draft, setDraft] = useState<OwnerContextDraft>({
    primaryCity: "",
    climateNotesInput: "",
    lastTireProduct: "",
    ownerStatedPrioritiesInput: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!vehicleId) {
      setIsLoading(false);
      return;
    }

    void (async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/vehicles");
        const body = (await response.json()) as {
          vehicles?: (VehicleOwnerProfile & { ownerContextMemory?: OwnerContextMemory })[];
          error?: string;
        };
        if (!response.ok) throw new Error(body.error ?? "Could not load vehicle");
        const vehicle = body.vehicles?.find((entry) => entry.id === vehicleId) ?? null;
        setDraft(draftFromOwnerContext(vehicle?.ownerContextMemory));
      } catch (loadError) {
        notify(loadError instanceof Error ? loadError.message : "Could not load assistant context", "error");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [vehicleId]);

  const saveDraft = async () => {
    if (!vehicleId) {
      notify("Add a vehicle first.", "error");
      return;
    }

    setIsSaving(true);
    try {
      await patchVehicleProfile(vehicleId, {
        ownerContextMemory: ownerContextFromDraft(draft),
      });
      notify("Assistant context saved.", "success");
    } catch (saveError) {
      notify(saveError instanceof Error ? saveError.message : "Save failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PanelCard
      title="Assistant context"
      description="City, climate, tires, and priorities — shapes recommendation copy, not OEM due dates."
    >
      <p className="text-xs leading-relaxed text-muted-foreground">
        The assistant uses these facts when explaining why something is due. You can edit them anytime.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading assistant context…</p>
      ) : (
        <div className="space-y-4">
          <FormField label="Primary city" htmlFor="owner-context-city" optional>
            <Input
              id="owner-context-city"
              value={draft.primaryCity}
              placeholder="Boston"
              onChange={(event) => setDraft({ ...draft, primaryCity: event.target.value })}
            />
          </FormField>

          <FormField
            label="Climate notes"
            htmlFor="owner-context-climate"
            optional
            hint="One note per line — e.g. heavy winter salt"
          >
            <Textarea
              id="owner-context-climate"
              value={draft.climateNotesInput}
              rows={3}
              placeholder={"Heavy winter salt\nGarage kept in winter"}
              onChange={(event) => setDraft({ ...draft, climateNotesInput: event.target.value })}
            />
          </FormField>

          <FormField label="Last tire product" htmlFor="owner-context-tires" optional>
            <Input
              id="owner-context-tires"
              value={draft.lastTireProduct}
              placeholder="Michelin Pilot Sport 4S"
              onChange={(event) => setDraft({ ...draft, lastTireProduct: event.target.value })}
            />
          </FormField>

          <FormField
            label="Stated priorities"
            htmlFor="owner-context-priorities"
            optional
            hint="One priority per line"
          >
            <Textarea
              id="owner-context-priorities"
              value={draft.ownerStatedPrioritiesInput}
              rows={3}
              placeholder={"Keep brakes quiet\nMaximize tire life"}
              onChange={(event) => setDraft({ ...draft, ownerStatedPrioritiesInput: event.target.value })}
            />
          </FormField>

          <Button type="button" onClick={() => void saveDraft()} disabled={!vehicleId || isSaving}>
            {isSaving ? "Saving…" : "Save assistant context"}
          </Button>
        </div>
      )}
    </PanelCard>
  );
}
