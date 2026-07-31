"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Mic, RotateCcw, Square } from "lucide-react";
import { FormActions, FormField } from "@/components/form-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSpeechRecognition } from "../lib/use-speech-recognition";

type VoiceMemoryPanelProps = {
  vehicleId: string;
  apiBase: string;
  defaultMileage: number;
  disabled?: boolean;
  minimal?: boolean;
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
  minimal = false,
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
  const hasTranscript = displayTranscript.length > 0;

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
        body: JSON.stringify(
          minimal
            ? {
                transcript,
                storageKey: nextStorageKey,
              }
            : {
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
              },
        ),
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
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {minimal
          ? "Say what happened. Include the service, approximate date, and mileage when you know them."
          : "Speak a service note — Vehicle OS transcribes it, stores the artifact, and records the service."}
      </p>

      {!speech.isSupported ? (
        <Alert variant="destructive">Browser speech recognition is unavailable. Type your note below instead.</Alert>
      ) : (
        <div
          className={`rounded-lg border px-3 py-3 ${
            speech.isListening
              ? "border-primary/35 bg-primary/[0.07]"
              : hasTranscript
                ? "border-border bg-muted/20"
                : "border-border bg-card"
          }`}
          role="status"
          aria-live="polite"
          data-testid="voice-capture-status"
        >
          <div className="flex items-start gap-3">
            <span className="relative mt-1 flex h-2.5 w-2.5 shrink-0">
              {speech.isListening ? (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              ) : null}
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                  speech.isListening ? "bg-primary" : hasTranscript ? "bg-emerald-500" : "bg-muted-foreground/40"
                }`}
              />
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                {speech.isListening
                  ? "Listening — text is appearing below"
                  : hasTranscript
                    ? "Voice note ready to review"
                    : "Microphone ready"}
              </p>
              <p className="text-xs text-muted-foreground">
                {speech.isListening
                  ? "Speak naturally. Stop when you are finished, then correct any words before saving."
                  : hasTranscript
                    ? "Read the transcript once, make any correction, then save it."
                    : "Nothing is saved until you review the transcript and tap Save voice note."}
              </p>
            </div>
          </div>
        </div>
      )}

      <FormActions className="grid grid-cols-2 pt-0 sm:flex">
        {speech.isListening ? (
          <Button
            type="button"
            className="col-span-2"
            disabled={disabled || isSubmitting}
            onClick={speech.stopListening}
          >
            <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
            Stop and review
          </Button>
        ) : (
          <Button
            type="button"
            className={hasTranscript ? undefined : "col-span-2"}
            disabled={disabled || isSubmitting || !speech.isSupported}
            onClick={speech.startListening}
          >
            <Mic className="h-4 w-4" aria-hidden />
            {hasTranscript ? "Continue speaking" : "Start voice note"}
          </Button>
        )}
        {hasTranscript && !speech.isListening ? (
          <Button
            type="button"
            variant="ghost"
            disabled={disabled || isSubmitting}
            onClick={() => {
              speech.resetTranscript();
              setStorageKey(null);
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Start over
          </Button>
        ) : null}
      </FormActions>

      {speech.error ? <Alert variant="destructive">{speech.error}</Alert> : null}

      <FormField
        label={speech.isListening ? "Live transcript" : "Transcript"}
        htmlFor="voice-transcript"
        hint={
          speech.isListening
            ? "Your words appear here in real time. Stop the microphone before editing."
            : "Review and correct the text before saving."
        }
      >
        <div data-testid="voice-live-transcript">
          <Textarea
            id="voice-transcript"
            rows={5}
            value={displayTranscript}
            readOnly={speech.isListening}
            disabled={disabled || isSubmitting}
            aria-describedby="voice-transcript-live-status"
            onChange={(event) => speech.setTranscript(event.target.value)}
            placeholder={
              speech.isListening
                ? "Listening…"
                : 'Example: "Changed oil at dealer, 62,200 miles, $110"'
            }
          />
          <span id="voice-transcript-live-status" className="sr-only" aria-live="polite">
            {speech.isListening ? speech.interimTranscript : ""}
          </span>
        </div>
      </FormField>

      {!minimal ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Shop" htmlFor="voice-shop">
            <Input
              id="voice-shop"
              value={form.shop}
              disabled={disabled || isSubmitting}
              onChange={(event) => setForm({ ...form, shop: event.target.value })}
            />
          </FormField>
          <FormField label="Service date" htmlFor="voice-date">
            <Input
              id="voice-date"
              value={form.serviceDate}
              disabled={disabled || isSubmitting}
              onChange={(event) => setForm({ ...form, serviceDate: event.target.value })}
            />
          </FormField>
          <FormField label="Mileage" htmlFor="voice-mileage">
            <Input
              id="voice-mileage"
              type="number"
              value={form.mileage}
              disabled={disabled || isSubmitting}
              onChange={(event) => setForm({ ...form, mileage: Number(event.target.value) })}
            />
          </FormField>
          <FormField label="Total" htmlFor="voice-total">
            <Input
              id="voice-total"
              value={form.total}
              disabled={disabled || isSubmitting}
              onChange={(event) => setForm({ ...form, total: event.target.value })}
            />
          </FormField>
        </div>
      ) : null}

      {!minimal ? (
        <FormField label="Line items" htmlFor="voice-lines">
          <Textarea
            id="voice-lines"
            rows={2}
            value={form.lineItems}
            disabled={disabled || isSubmitting}
            onChange={(event) => setForm({ ...form, lineItems: event.target.value })}
          />
        </FormField>
      ) : null}

      <Button
        type="button"
        className="w-full"
        disabled={disabled || isSubmitting || isUploading || speech.isListening || !hasTranscript}
        onClick={() => void submitVoiceMemory()}
      >
        {!isSubmitting ? <Check className="h-4 w-4" aria-hidden /> : null}
        {isSubmitting ? "Saving voice note…" : minimal ? "Save voice note" : "Confirm voice note → run loop"}
      </Button>
    </div>
  );
}
