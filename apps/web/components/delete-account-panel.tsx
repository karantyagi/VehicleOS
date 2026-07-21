"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
    <section className="settings-danger">
      <h2>Delete account</h2>
      <p>
        Permanently remove your sign-in and all vehicle data stored in VehicleOS — vehicles,
        service history, and recommendations. This cannot be undone.
      </p>
      <p className="settings-muted">
        To request a copy of your data before deleting, email {siteConfig.contactEmail}.
      </p>

      {!isOpen ? (
        <button type="button" className="danger-button" onClick={() => setIsOpen(true)}>
          Delete my account and data
        </button>
      ) : (
        <div className="delete-panel">
          <label htmlFor="delete-confirm">
            Type <strong>DELETE</strong> to confirm
          </label>
          <input
            id="delete-confirm"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <div className="delete-actions">
            <button type="button" disabled={!canConfirm} onClick={handleDelete}>
              {isBusy ? "Deleting…" : "Confirm deletion"}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={isBusy}
              onClick={() => {
                setIsOpen(false);
                setConfirmText("");
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
          {error ? <p className="settings-error">{error}</p> : null}
        </div>
      )}
    </section>
  );
}
