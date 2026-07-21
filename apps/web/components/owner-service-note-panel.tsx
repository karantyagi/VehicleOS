"use client";

import { useState } from "react";

type OwnerServiceNotePanelProps = {
  vehicleId: string;
  apiBase: string;
  defaultMileage: number;
  disabled?: boolean;
  onError: (message: string) => void;
  onSubmitted: (body: {
    timeline: unknown[];
    nowQueue: unknown[];
    conflict?: boolean;
  }) => void;
};

export function OwnerServiceNotePanel({
  vehicleId,
  apiBase,
  defaultMileage,
  disabled = false,
  onError,
  onSubmitted,
}: OwnerServiceNotePanelProps) {
  const [shop, setShop] = useState("");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [mileage, setMileage] = useState(defaultMileage);
  const [note, setNote] = useState("");
  const [source, setSource] = useState<"owner_note" | "dealer">("owner_note");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!note.trim()) {
      onError("Add a short note describing the service or decision.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop: shop.trim() || undefined,
          serviceDate,
          mileage: Number(mileage),
          note: note.trim(),
          source,
        }),
      });

      const body = (await response.json()) as {
        timeline: unknown[];
        nowQueue: unknown[];
        conflict?: boolean;
        error?: string;
      };

      if (!response.ok && response.status !== 409) {
        onError(body.error ?? "Could not save owner note.");
        return;
      }

      onSubmitted(body);
      setNote("");
    } catch {
      onError("Could not save owner note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="owner-note-panel">
      <p className="muted">
        Log dealer visits or owner decisions without a receipt — e.g. “skipped cabin filter — DIY”.
      </p>
      <label>
        Recorded at
        <select
          value={source}
          disabled={disabled || isSubmitting}
          onChange={(event) => setSource(event.target.value as "owner_note" | "dealer")}
        >
          <option value="owner_note">Owner note</option>
          <option value="dealer">Dealer service</option>
        </select>
      </label>
      <label>
        Shop (optional)
        <input
          value={shop}
          disabled={disabled || isSubmitting}
          onChange={(event) => setShop(event.target.value)}
          placeholder={source === "dealer" ? "Honda dealer" : "Owner noted"}
        />
      </label>
      <label>
        Service date
        <input
          type="date"
          value={serviceDate}
          disabled={disabled || isSubmitting}
          onChange={(event) => setServiceDate(event.target.value)}
        />
      </label>
      <label>
        Mileage
        <input
          type="number"
          value={mileage}
          disabled={disabled || isSubmitting}
          onChange={(event) => setMileage(Number(event.target.value))}
        />
      </label>
      <label>
        Note
        <textarea
          rows={3}
          value={note}
          disabled={disabled || isSubmitting}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Skipped cabin filter — replacing myself next month"
        />
      </label>
      <button type="button" disabled={disabled || isSubmitting} onClick={() => void submit()}>
        {isSubmitting ? "Saving…" : "Save to timeline"}
      </button>
    </div>
  );
}
