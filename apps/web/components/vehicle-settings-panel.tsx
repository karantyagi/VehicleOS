"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FormActions, FormField } from "@/components/form-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/notify";

type VehicleRecord = {
  id: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  currentMileage: number;
  vin: string;
};

export function VehicleSettingsPanel() {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<VehicleRecord | null>(null);
  const [form, setForm] = useState({ year: "", make: "", model: "", trim: "", mileage: "", vin: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/vehicles");
        const body = (await response.json()) as { vehicles?: VehicleRecord[]; error?: string };
        if (!response.ok) throw new Error(body.error ?? "Could not load vehicle");
        const first = body.vehicles?.[0] ?? null;
        setVehicle(first);
        if (first) {
          setForm({
            year: String(first.year),
            make: first.make,
            model: first.model,
            trim: first.trim ?? "",
            mileage: String(first.currentMileage),
            vin: first.vin,
          });
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load vehicle");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const saveVehicle = async () => {
    if (!vehicle) return;
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
          vin: form.vin.trim() || vehicle.vin,
        }),
      });
      const body = (await response.json()) as { vehicle?: VehicleRecord; error?: string };
      if (!response.ok || !body.vehicle) throw new Error(body.error ?? "Update failed");
      setVehicle(body.vehicle);
      notify("Vehicle updated.", "success");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Update failed");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteVehicle = async () => {
    if (!vehicle || deleteConfirm !== "DELETE") return;
    setIsDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/vehicles/${vehicle.id}`, { method: "DELETE" });
      const body = (await response.json()) as { deleted?: boolean; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Delete failed");
      notify("Vehicle and service history removed.", "success");
      window.location.href = "/";
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your vehicle</CardTitle>
          <CardDescription>Loading…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!vehicle) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your vehicle</CardTitle>
          <CardDescription>No vehicle on file — complete onboarding from the dashboard.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your vehicle</CardTitle>
        <CardDescription>Update mileage or details when your situation changes. Deleting removes all history for this car.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </FormActions>

        {!deleteOpen ? (
          <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
            Delete this vehicle and all history
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm text-muted-foreground">
              This permanently removes timeline, evidence links, and Now queue items for this vehicle. Type{" "}
              <strong className="text-foreground">DELETE</strong> to confirm.
            </p>
            <FormField label="Confirmation" htmlFor="vehicle-delete-confirm">
              <Input
                id="vehicle-delete-confirm"
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
                autoComplete="off"
              />
            </FormField>
            <FormActions>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteConfirm !== "DELETE" || isDeleting}
                onClick={() => void deleteVehicle()}
              >
                {isDeleting ? "Deleting…" : "Confirm delete vehicle"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteConfirm("");
                }}
              >
                Cancel
              </Button>
            </FormActions>
          </div>
        )}

        {error ? <Alert variant="destructive">{error}</Alert> : null}
      </CardContent>
    </Card>
  );
}
