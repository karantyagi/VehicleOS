"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormActions, FormField } from "@/components/form-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { siteConfig } from "../lib/site-config";

export function DeleteAccountPanel() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  const canConfirm = confirmText === "DELETE" && !isBusy;

  const handleDelete = async () => {
    if (!canConfirm) return;

    setIsBusy(true);
    setError("");

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Deletion failed");
      }

      router.push("/login?deleted=1");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Deletion failed");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive">Delete account</CardTitle>
        <CardDescription>
          Permanently remove your sign-in and all vehicle data stored in VehicleOS — vehicles, service history, and
          recommendations. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          To request a copy of your data before deleting, email {siteConfig.contactEmail}.
        </p>

        {!isOpen ? (
          <Button type="button" variant="destructive" onClick={() => setIsOpen(true)}>
            Delete my account and data
          </Button>
        ) : (
          <div className="space-y-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <FormField label="Type DELETE to confirm" htmlFor="delete-confirm">
              <Input
                id="delete-confirm"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </FormField>
            <FormActions>
              <Button type="button" variant="destructive" disabled={!canConfirm} onClick={handleDelete}>
                {isBusy ? "Deleting…" : "Confirm deletion"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={() => {
                  setIsOpen(false);
                  setConfirmText("");
                  setError("");
                }}
              >
                Cancel
              </Button>
            </FormActions>
            {error ? <Alert variant="destructive">{error}</Alert> : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
