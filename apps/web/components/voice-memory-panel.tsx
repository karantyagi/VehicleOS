"use client";

import { useEffect, useMemo, useState } from "react";
import { useSpeechRecognition } from "../lib/use-speech-recognition";

type VoiceMemoryPanelProps = {
  vehicleId: string;
  apiBase: string;
  defaultMileage: number;
  disabled?: boolean;
  onSubmitted: (body: {
    timeline: unknown[];
    nowQueue: unknown[];
    conflict?: boolean;
  }) => void;
  onError: (message: string) => void;
};

type VoiceForm = {
  shop: string;
  serviceDate: string;
  mileage: number;
  lineItems: string;
  total: string;
};

export function VoiceMemoryPanel({
  vehicleId,
  apiBase,
  defaultMileage,
  disabled = false,
  onSubmitted,
  onError,
}: VoiceMemoryPanelProps) {
  const speech = useSpeechRecognition();
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<VoiceForm>({
    shop: "",
    serviceDate: new Date().toISOString().slice(0, 10),
    mileage: defaultMileage,
    lineItems: "",
    total: "",
  });

  useEffect(() => {
    setForm((current) => ({ ...current, mileage: defaultMileage }));
  }, [defaultMileage]);

  const displayTranscript = useMemo(() => {
    const parts = [speech.transcript, speech.interimTranscript].filter(Boolean);
    return parts.join(" ").trim();
  }, [speech.interimTranscript, speech.transcript]);

  const uploadTranscript = async (transcript: string) => {
    const formData = new FormData();
    formData.append("transcript", transcript);

    const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/voice/upload`, {
      method: "POST",
      body: formData,
    });

    const body = (await response.json()) as { storageKey?: string; error?: string };
    if (!response.ok || !body.storageKey) {
      throw new Error(body.error ?? "Voice upload failed");
    }

    return body.storageKey;
  };

  const submitVoiceMemory = async () => {
    const transcript = displayTranscript.trim() || speech.transcript.trim();
    if (!transcript) {
      onError("Record or type a voice note first.");
      return;
    }

    setIsSubmitting(true);
    onError("");

    try {
      setIsUploading(true);
      const nextStorageKey = storageKey ?? (await uploadTranscript(transcript));
      setStorageKey(nextStorageKey);
      setIsUploading(false);

      const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          storageKey: nextStorageKey,
          shop: form.shop,
          serviceDate: form.serviceDate,
          mileage: Number(form.mileage),
          lineItems: form.lineItems
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          total: form.total,
        }),
      });

      const body = (await response.json()) as {
        timeline: unknown[];
        nowQueue: unknown[];
        conflict?: boolean;
        error?: string;
      };

      if (!response.ok && response.status !== 409) {
        throw new Error(body.error ?? "Voice note failed");
      }

      const parsed = (body as { parsed?: VoiceForm & { lineItems?: string[] } }).parsed;
      if (parsed) {
        setForm({
          shop: parsed.shop,
          serviceDate: parsed.serviceDate,
          mileage: parsed.mileage,
          lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems.join("\n") : form.lineItems,
          total: parsed.total,
        });
      }

      onSubmitted(body);
      speech.resetTranscript();
      setStorageKey(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Voice note failed.");
    } finally {
      setIsUploading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="voice-panel">
      <p className="muted">
        Speak a service note — Vehicle OS transcribes it, stores the artifact, and records the service.
      </p>

      {!speech.isSupported ? (
        <p className="settings-error">
          Browser speech recognition is unavailable. Type your note below instead.
        </p>
      ) : null}

      <div className="actions">
        <button
          type="button"
          disabled={disabled || isSubmitting || speech.isListening}
          onClick={speech.startListening}
        >
          {speech.isListening ? "Listening…" : "Start voice note"}
        </button>
        <button
          type="button"
          disabled={disabled || isSubmitting || !speech.isListening}
          onClick={speech.stopListening}
        >
          Stop
        </button>
        <button
          type="button"
          className="link-button"
          disabled={disabled || isSubmitting}
          onClick={() => {
            speech.resetTranscript();
            setStorageKey(null);
          }}
        >
          Clear
        </button>
      </div>

      {speech.error ? <p className="settings-error">{speech.error}</p> : null}

      <label>
        Transcript
        <textarea
          rows={4}
          value={displayTranscript || speech.transcript}
          disabled={disabled || isSubmitting}
          onChange={(event) => speech.setTranscript(event.target.value)}
          placeholder='Example: "Changed oil at dealer, 62,200 miles, $110"'
        />
      </label>

      <label>
        Shop
        <input
          value={form.shop}
          disabled={disabled || isSubmitting}
          onChange={(event) => setForm({ ...form, shop: event.target.value })}
        />
      </label>
      <label>
        Service date
        <input
          value={form.serviceDate}
          disabled={disabled || isSubmitting}
          onChange={(event) => setForm({ ...form, serviceDate: event.target.value })}
        />
      </label>
      <label>
        Mileage
        <input
          type="number"
          value={form.mileage}
          disabled={disabled || isSubmitting}
          onChange={(event) => setForm({ ...form, mileage: Number(event.target.value) })}
        />
      </label>
      <label>
        Line items
        <textarea
          rows={2}
          value={form.lineItems}
          disabled={disabled || isSubmitting}
          onChange={(event) => setForm({ ...form, lineItems: event.target.value })}
        />
      </label>
      <label>
        Total
        <input
          value={form.total}
          disabled={disabled || isSubmitting}
          onChange={(event) => setForm({ ...form, total: event.target.value })}
        />
      </label>

      <button
        type="button"
        disabled={disabled || isSubmitting || isUploading}
        onClick={() => void submitVoiceMemory()}
      >
        {isSubmitting ? "Saving voice memory…" : "Confirm voice note → run loop"}
      </button>
    </div>
  );
}
