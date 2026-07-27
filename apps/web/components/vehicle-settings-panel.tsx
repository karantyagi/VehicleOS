"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FormActions, FormField } from "@/components/form-field";
import { DateField } from "@/components/date-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { VehicleOwnerProfile } from "@/lib/driver-habits";
import { todayIsoDate } from "@/lib/date-input";
import { notify } from "@/lib/notify";

export function VehicleSettingsPanel({
  vehicleId,
  minimal = false,
}: {
  vehicleId: string | null;
  minimal?: boolean;
}) {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<VehicleOwnerProfile | null>(null);
  const [form, setForm] = useState({
    year: "",
    make: "",
    model: "",
    trim: "",
    mileage: "",
    vin: "",
    ownedSince: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!vehicleId) {
      setVehicle(null);
      setIsLoading(false);
      return;
    }

    void (async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/vehicles");
        const body = (await response.json()) as {
          vehicles?: (VehicleOwnerProfile & {
            year: number;
            make: string;
            model: string;
            trim?: string;
            currentMileage: number;
            vin: string;
          })[];
          error?: string;
        };
        if (!response.ok) throw new Error(body.error ?? "Could not load vehicle");
        const match = body.vehicles?.find((entry) => entry.id === vehicleId) ?? null;
        setVehicle(match);
        if (match) {
          setForm({
            year: String(match.year),
            make: match.make,
            model: match.model,
            trim: match.trim ?? "",
            mileage: String(match.currentMileage),
            vin: match.vin,
            ownedSince: match.ownedSince ?? "",
          });
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load vehicle");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [vehicleId]);

  const saveVehicle = async () => {
    if (!vehicle) return;
    if (!form.ownedSince.trim()) {
      setError("Owned since is required — it anchors calendar reminders when receipts are missing.");
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
      const body = (await response.json()) as {
        vehicle?: VehicleOwnerProfile & {
          year: number;
          make: string;
          model: string;
          trim?: string;
          currentMileage: number;
          vin: string;
        };
        error?: string;
      };
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vehicles</CardTitle>
          <CardDescription>Loading…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!vehicle) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vehicles</CardTitle>
          <CardDescription>No vehicle on file — complete onboarding from the assistant workspace.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        {!minimal ? (
          <>
            <CardTitle>Vehicles</CardTitle>
            <CardDescription>Update mileage or details when your situation changes.</CardDescription>
          </>
        ) : (
          <CardTitle className="sr-only">Vehicles</CardTitle>
        )}
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
          <FormField
            label="Owned since"
            htmlFor="vehicle-owned-since"
            hint="Required — calendar anchor when receipts are missing"
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
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </FormActions>

        {error ? <Alert variant="destructive">{error}</Alert> : null}
      </CardContent>
    </Card>
  );
}
