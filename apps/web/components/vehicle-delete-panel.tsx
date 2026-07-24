"use client";

import { useEffect, useState } from "react";
import { FormActions, FormField } from "@/components/form-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { VehicleOwnerProfile } from "@/lib/driver-habits";
import { notify } from "@/lib/notify";

export function VehicleDeletePanel() {
  const [vehicle, setVehicle] = useState<VehicleOwnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/vehicles");
        const body = (await response.json()) as {
          vehicles?: VehicleOwnerProfile[];
          error?: string;
        };
        if (!response.ok) throw new Error(body.error ?? "Could not load vehicle");
        setVehicle(body.vehicles?.[0] ?? null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load vehicle");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

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
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!vehicle) {
    return <p className="text-sm text-muted-foreground">No vehicle on file.</p>;
  }

  return (
    <div className="space-y-3">
      {!deleteOpen ? (
        <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
          Delete this vehicle and all history
        </Button>
      ) : (
        <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm text-muted-foreground">
            This permanently removes service history, evidence, and verification items for this vehicle. Type{" "}
            <strong className="text-foreground">DELETE</strong> to confirm.
          </p>
          <FormField label="Confirmation" htmlFor="settings-vehicle-delete-confirm">
            <Input
              id="settings-vehicle-delete-confirm"
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
    </div>
  );
}
