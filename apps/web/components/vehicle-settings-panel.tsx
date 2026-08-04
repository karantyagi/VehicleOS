"use client";

import { useState } from "react";
import { FormActions, FormField } from "@/components/form-field";
import { DateField } from "@/components/date-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { todayIsoDate } from "@/lib/date-input";
import type { GarageVehicleSummary } from "@/lib/garage/types";
import { notify } from "@/lib/notify";

type VehicleForm = {
  year: string;
  make: string;
  model: string;
  trim: string;
  mileage: string;
  vin: string;
  ownedSince: string;
};

const vehicleFormFromRecord = (vehicle: GarageVehicleSummary | null): VehicleForm => ({
  year: vehicle ? String(vehicle.year) : "",
  make: vehicle?.make ?? "",
  model: vehicle?.model ?? "",
  trim: vehicle?.trim ?? "",
  mileage: vehicle ? String(vehicle.currentMileage) : "",
  vin: vehicle?.vin ?? "",
  ownedSince: vehicle?.ownedSince ?? "",
});

type VehicleSettingsPanelProps = {
  vehicle: GarageVehicleSummary | null;
  minimal?: boolean;
  onVehicleUpdated?: () => Promise<void>;
};

export function VehicleSettingsPanel({
  vehicle,
  minimal = false,
  onVehicleUpdated,
}: VehicleSettingsPanelProps) {
  const [form, setForm] = useState<VehicleForm>(() => vehicleFormFromRecord(vehicle));
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const startEditing = () => {
    setForm(vehicleFormFromRecord(vehicle));
    setError("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setForm(vehicleFormFromRecord(vehicle));
    setError("");
    setIsEditing(false);
  };

  const saveVehicle = async () => {
    if (!vehicle) return;
    if (!form.ownedSince.trim()) {
      setError("Owned since is required - it anchors calendar planning when receipts are missing.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: Number(form.year),
          make: form.make.trim(),
          model: form.model.trim(),
          trim: form.trim.trim() || undefined,
          currentMileage: Number(form.mileage),
          vin: form.vin.trim() || undefined,
          ownedSince: form.ownedSince.trim(),
        }),
      });
      const body = (await response.json()) as { vehicle?: GarageVehicleSummary; error?: string };
      if (!response.ok || !body.vehicle) throw new Error(body.error ?? "Update failed");
      await onVehicleUpdated?.();
      setIsEditing(false);
      notify("Vehicle updated.", "success");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Update failed");
    } finally {
      setIsSaving(false);
    }
  };

  if (!vehicle) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vehicles</CardTitle>
          <CardDescription>No vehicle on file - complete onboarding from the assistant workspace.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const vehicleLabel = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ");
  const vinEnding = vehicle.vin ? `Ending ${vehicle.vin.slice(-4)}` : "Not recorded";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
        <div className="space-y-1.5">
          {!minimal ? (
            <>
              <CardTitle>Vehicles</CardTitle>
              <CardDescription>Keep the details that anchor your schedule up to date.</CardDescription>
            </>
          ) : (
            <CardTitle className="sr-only">Vehicles</CardTitle>
          )}
        </div>
        {!isEditing ? (
          <Button type="button" variant="outline" size="sm" onClick={startEditing}>
            Edit vehicle
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Year" htmlFor="vehicle-year">
                <Input
                  id="vehicle-year"
                  type="number"
                  value={form.year}
                  onChange={(event) => setForm({ ...form, year: event.target.value })}
                />
              </FormField>
              <FormField label="Current mileage" htmlFor="vehicle-mileage">
                <Input
                  id="vehicle-mileage"
                  type="number"
                  className="tabular-nums"
                  value={form.mileage}
                  onChange={(event) => setForm({ ...form, mileage: event.target.value })}
                />
              </FormField>
              <FormField
                label="Owned since"
                htmlFor="vehicle-owned-since"
                hint="Required - calendar anchor when receipts are missing"
              >
                <DateField
                  id="vehicle-owned-since"
                  value={form.ownedSince}
                  max={todayIsoDate()}
                  onChange={(ownedSince) => setForm({ ...form, ownedSince })}
                />
              </FormField>
              <FormField label="Make" htmlFor="vehicle-make">
                <Input id="vehicle-make" value={form.make} onChange={(event) => setForm({ ...form, make: event.target.value })} />
              </FormField>
              <FormField label="Model" htmlFor="vehicle-model">
                <Input id="vehicle-model" value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} />
              </FormField>
              <FormField label="Trim (optional)" htmlFor="vehicle-trim">
                <Input id="vehicle-trim" value={form.trim} onChange={(event) => setForm({ ...form, trim: event.target.value })} />
              </FormField>
            </div>

            <FormActions>
              <Button type="button" disabled={isSaving} onClick={() => void saveVehicle()}>
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
              <Button type="button" variant="ghost" disabled={isSaving} onClick={cancelEditing}>
                Cancel
              </Button>
            </FormActions>
          </>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="text-base font-semibold text-foreground">{vehicleLabel}</p>
              <p className="mt-1 text-sm text-muted-foreground">Your schedule uses these details as its vehicle anchor.</p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <dt className="text-xs font-medium text-muted-foreground">Odometer</dt>
                <dd className="mt-1 text-sm font-medium tabular-nums text-foreground">
                  {vehicle.currentMileage.toLocaleString()} mi
                </dd>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <dt className="text-xs font-medium text-muted-foreground">Owned since</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{vehicle.ownedSince || "Not recorded"}</dd>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <dt className="text-xs font-medium text-muted-foreground">VIN</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{vinEnding}</dd>
              </div>
            </dl>
          </div>
        )}

        {error ? <Alert variant="destructive">{error}</Alert> : null}
      </CardContent>
    </Card>
  );
}
