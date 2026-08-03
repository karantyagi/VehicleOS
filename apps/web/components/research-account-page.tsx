"use client";

import { useState } from "react";

type PortalError = string | null;

export function ResearchAccountPage({ email, operator }: { email: string; operator: boolean }) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<PortalError>(null);

  const deleteAccount = async () => {
    if (confirmText !== "DELETE" || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const body = (await response.json()) as { deleted?: boolean; error?: string };
      if (!response.ok || !body.deleted) throw new Error(body.error ?? "Could not delete your research account.");
      window.location.assign("/login?deleted=1");
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete your research account.");
      setDeleting(false);
    }
  };

  return (
    <section>
      <header className="border-b border-border pb-6">
        <p className="text-sm font-medium text-primary">{operator ? "VehicleOS research operator" : "VehicleOS import research"}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Account & data</h1>
        <p className="mt-2 text-sm text-muted-foreground">{email}</p>
      </header>

      <section className="mt-8 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-destructive">Delete research account</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          This removes your research sign-in and any PDFs, drafts, and corrections stored under this account.
          Anonymous quality counts may remain without a PDF, VIN, filename, draft, or account identifier.
        </p>
        {operator ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            It never deletes other participants&apos; research. If this email remains on the operator allowlist, signing in again restores operator access.
          </p>
        ) : null}
        <label className="mt-5 block text-sm font-medium text-foreground">
          Type DELETE to confirm
          <input
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="mt-2 h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={confirmText !== "DELETE" || deleting}
          onClick={() => void deleteAccount()}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete account"}
        </button>
        {deleteError ? <p className="mt-3 text-sm text-destructive">{deleteError}</p> : null}
      </section>
    </section>
  );
}
