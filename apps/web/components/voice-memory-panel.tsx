"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, CircleCheck, FileText, Gauge, Mic, RotateCcw, Square } from "lucide-react";
import { DateField } from "@/components/date-field";
import { FormActions, FormField } from "@/components/form-field";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { todayIsoDate } from "@/lib/date-input";
import { parseServiceNoteDraft, serviceNoteDraftStorageKey } from "@/lib/service-note-draft";
import { DEFAULT_SERVICE_NOTE_STARTERS } from "@/lib/service-note-starters";
import { useSpeechRecognition } from "../lib/use-speech-recognition";

type ServiceNotePanelProps = {
  vehicleId: string;
  apiBase: string;
  defaultMileage: number;
  disabled?: boolean;
  minimal?: boolean;
  persistDraft?: boolean;
  recentStarters?: string[];
  isOnline?: boolean;
  onSubmitted: (body: {
    timeline: unknown[];
    nowQueue: unknown[];
    conflict?: boolean;
    transcript?: string;
  }) => void;
  onError: (message: string) => void;
  onDraftActivityChange?: (hasDraft: boolean) => void;
};

type ServiceNoteForm = {
  shop: string;
  serviceDate: string;
  mileage: number;
  lineItems: string;
  total: string;
};

/**
 * The canonical capture surface is editable text. Browser dictation is an
 * optional way to fill the same field and never creates a separate audio flow.
 */
export function ServiceNotePanel({
  vehicleId,
  apiBase,
  defaultMileage,
  disabled = false,
  minimal = false,
  persistDraft = false,
  recentStarters = [],
  isOnline = true,
  onSubmitted,
  onError,
  onDraftActivityChange,
}: ServiceNotePanelProps) {
  const speech = useSpeechRecognition();
  const [captureChannel, setCaptureChannel] = useState<"text" | "voice">("text");
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDraftReady, setIsDraftReady] = useState(!persistDraft);
  const [wasDraftRestored, setWasDraftRestored] = useState(false);
  const [form, setForm] = useState<ServiceNoteForm>({
    shop: "",
    serviceDate: todayIsoDate(),
    mileage: defaultMileage,
    lineItems: "",
    total: "",
  });

  useEffect(() => {
    if (!persistDraft) {
      setIsDraftReady(true);
      return;
    }

    const draft = parseServiceNoteDraft(window.localStorage.getItem(serviceNoteDraftStorageKey(vehicleId)));
    if (draft) {
      speech.setTranscript(draft.text);
      setForm((current) => ({ ...current, serviceDate: draft.serviceDate, mileage: draft.mileage }));
      setIsDetailsOpen(draft.serviceDate !== todayIsoDate() || draft.mileage !== defaultMileage);
      setWasDraftRestored(true);
    }
    setIsDraftReady(true);
  }, [defaultMileage, persistDraft, speech.setTranscript, vehicleId]);

  useEffect(() => {
    if (persistDraft || wasDraftRestored) return;
    setForm((current) => ({ ...current, mileage: defaultMileage }));
  }, [defaultMileage, persistDraft, wasDraftRestored]);

  const noteText = useMemo(() => {
    const parts = [speech.transcript, speech.interimTranscript].filter(Boolean);
    return parts.join(" ").trim();
  }, [speech.interimTranscript, speech.transcript]);
  const hasNoteText = noteText.length > 0;
  const lastKnownMileage = new Intl.NumberFormat("en-US").format(defaultMileage);
  const draftStorageKey = serviceNoteDraftStorageKey(vehicleId);

  useEffect(() => {
    onDraftActivityChange?.(hasNoteText);
  }, [hasNoteText, onDraftActivityChange]);

  useEffect(() => () => onDraftActivityChange?.(false), [onDraftActivityChange]);

  useEffect(() => {
    if (!persistDraft || !isDraftReady) return;

    try {
      if (!noteText.trim()) {
        window.localStorage.removeItem(draftStorageKey);
        return;
      }

      window.localStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          text: noteText,
          serviceDate: form.serviceDate,
          mileage: form.mileage,
        }),
      );
    } catch {
      // Storage is optional. Capture must remain usable in private mode or when it is full.
    }
  }, [draftStorageKey, form.mileage, form.serviceDate, isDraftReady, noteText, persistDraft]);

  const updateNoteText = (value: string) => {
    speech.setTranscript(value);
    setStorageKey(null);
  };

  const addQuickStarter = (starter: string) => {
    const nextText = noteText.trim() ? `${noteText.trim()}\n${starter}` : starter;
    setCaptureChannel("text");
    updateNoteText(nextText);
  };

  const discardDraft = () => {
    try {
      window.localStorage.removeItem(draftStorageKey);
    } catch {
      // A blocked storage area should not prevent clearing visible form data.
    }
    speech.resetTranscript();
    setCaptureChannel("text");
    setStorageKey(null);
    setForm({ shop: "", serviceDate: todayIsoDate(), mileage: defaultMileage, lineItems: "", total: "" });
    setIsDetailsOpen(false);
    setWasDraftRestored(false);
  };

  const uploadNoteText = async (text: string) => {
    const formData = new FormData();
    formData.append("transcript", text);
    formData.append("captureChannel", captureChannel);

    const response = await fetch(apiBase + "/api/vehicles/" + vehicleId + "/voice/upload", {
      method: "POST",
      body: formData,
    });

    const body = (await response.json()) as { storageKey?: string; error?: string };
    if (!response.ok || !body.storageKey) {
      throw new Error(body.error ?? "Service note upload failed");
    }

    return body.storageKey;
  };

  const submitServiceNote = async () => {
    const text = noteText.trim() || speech.transcript.trim();
    if (!text) {
      onError("Type or dictate a service note first.");
      return;
    }

    setIsSubmitting(true);
    onError("");

    try {
      setIsUploading(true);
      const nextStorageKey = storageKey ?? (await uploadNoteText(text));
      setStorageKey(nextStorageKey);
      setIsUploading(false);

      const response = await fetch(apiBase + "/api/vehicles/" + vehicleId + "/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          minimal
            ? {
                transcript: text,
                storageKey: nextStorageKey,
                captureChannel,
                ...(form.serviceDate !== todayIsoDate() ? { serviceDate: form.serviceDate } : {}),
                ...(form.mileage !== defaultMileage ? { mileage: Number(form.mileage) } : {}),
              }
            : {
                transcript: text,
                storageKey: nextStorageKey,
                captureChannel,
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
        transcript?: string;
        error?: string;
      };

      if (!response.ok && response.status !== 409) {
        throw new Error(body.error ?? "Service note failed");
      }

      const parsed = (body as { parsed?: ServiceNoteForm & { lineItems?: string[] } }).parsed;
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
      setCaptureChannel("text");
      setStorageKey(null);
      setWasDraftRestored(false);
      if (minimal) {
        setForm({ shop: "", serviceDate: todayIsoDate(), mileage: defaultMileage, lineItems: "", total: "" });
        setIsDetailsOpen(false);
      }
      if (persistDraft) {
        try {
          window.localStorage.removeItem(draftStorageKey);
        } catch {
          // The service record is already saved; a stale local draft is harmless.
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "Service note failed.");
    } finally {
      setIsUploading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.09] via-primary/[0.035] to-transparent p-4">
        <div className="absolute -right-5 -top-7 h-20 w-20 rounded-full bg-primary/[0.08] blur-2xl" aria-hidden />
        <div className="relative flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <FileText className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Tell us what changed</p>
              <Badge className="border-primary/15 bg-background/80 text-[10px] text-primary">Private to your garage</Badge>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {minimal
                ? "One short sentence is enough. Add a date or mileage only if it changed."
                : "Start with the service, then add the details you know. You can correct everything before saving."}
            </p>
          </div>
        </div>
        <div className="relative mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <CircleCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span>No service history is saved until you review and tap Save.</span>
          {persistDraft && hasNoteText ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-0 py-0 text-[11px] font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
              disabled={disabled || isSubmitting}
              aria-label="Discard saved service-note draft"
              onClick={discardDraft}
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              {wasDraftRestored ? "Draft restored" : "Draft saved"} · Discard
            </Button>
          ) : null}
        </div>
      </section>

      {speech.isSupported && (speech.isListening || (hasNoteText && captureChannel === "voice")) ? (
        <div
          className={
            speech.isListening
              ? "rounded-lg border border-primary/35 bg-primary/[0.07] px-3 py-3"
              : "rounded-lg border border-border bg-muted/20 px-3 py-3"
          }
          role="status"
          aria-live="polite"
          data-testid="service-note-capture-status"
        >
          <div className="flex items-start gap-3">
            <span className="relative mt-1 flex h-2.5 w-2.5 shrink-0">
              {speech.isListening ? (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              ) : null}
              <span
                className={
                  speech.isListening
                    ? "relative inline-flex h-2.5 w-2.5 rounded-full bg-primary"
                    : "relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"
                }
              />
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                {speech.isListening ? "Listening - text is appearing below" : "Dictation ready to review"}
              </p>
              <p className="text-xs text-muted-foreground">
                {speech.isListening
                  ? "Speak naturally. Stop when you are finished, then correct any words before saving."
                  : "Read the text once, make any correction, then save it."}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <FormField
        label={speech.isListening ? "Live service note" : "What happened?"}
        htmlFor="service-note-text"
        hint={
          speech.isListening
            ? "Your words appear here in real time. Stop the microphone before editing."
            : "Type what happened, or use Dictate instead. Review and correct the text before saving."
        }
      >
        <div data-testid="service-note-text">
          <Textarea
            id="service-note-text"
            rows={5}
            value={noteText}
            readOnly={speech.isListening}
            disabled={disabled || isSubmitting}
            aria-describedby="service-note-live-status"
            className="min-h-36 rounded-xl border-border/90 bg-card px-4 py-3.5 text-[15px] leading-relaxed shadow-[0_8px_18px_-18px_hsl(var(--foreground)/0.35)] transition-shadow placeholder:text-muted-foreground/80 focus-visible:shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]"
            onChange={(event) => updateNoteText(event.target.value)}
            placeholder={
              speech.isListening
                ? "Listening..."
                : 'Example: "Oil changed at dealer, 62,200 miles, $110"'
            }
          />
          <span id="service-note-live-status" className="sr-only" aria-live="polite">
            {speech.isListening ? speech.interimTranscript : ""}
          </span>
        </div>
      </FormField>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">Start with a service</p>
          {minimal ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Gauge className="h-3.5 w-3.5" aria-hidden />
              Last known: {lastKnownMileage} mi
            </span>
          ) : null}
        </div>
        {recentStarters.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground">Recent services</p>
            <div className="flex flex-wrap gap-2" aria-label="Recent service note starters">
              {recentStarters.map((starter) => (
                <Button
                  key={starter}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full border-primary/20 bg-primary/[0.04] px-3 text-xs shadow-none hover:border-primary/35 hover:bg-primary/[0.08]"
                  disabled={disabled || isSubmitting || speech.isListening}
                  onClick={() => addQuickStarter(starter)}
                >
                  {starter}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="space-y-2">
          {recentStarters.length > 0 ? <p className="text-[11px] font-medium text-muted-foreground">Common services</p> : null}
          <div className="flex flex-wrap gap-2" aria-label="Common service note starters">
            {DEFAULT_SERVICE_NOTE_STARTERS.map((starter) => (
            <Button
              key={starter}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-full border-border/80 bg-background/70 px-3 text-xs shadow-none hover:border-primary/30 hover:bg-primary/[0.06]"
              disabled={disabled || isSubmitting || speech.isListening}
              onClick={() => addQuickStarter(starter)}
            >
              {starter}
            </Button>
            ))}
          </div>
        </div>
        {minimal ? (
          <Button
            type="button"
            variant="ghost"
            className="h-8 -ml-2 px-2 text-xs text-muted-foreground hover:text-foreground"
            aria-expanded={isDetailsOpen}
            aria-controls="service-note-optional-details"
            disabled={disabled || isSubmitting || speech.isListening}
            onClick={() => setIsDetailsOpen((open) => !open)}
          >
            Add date or mileage if it changed
            <ChevronDown
              className={
                isDetailsOpen ? "h-3.5 w-3.5 rotate-180 transition-transform" : "h-3.5 w-3.5 transition-transform"
              }
              aria-hidden
            />
          </Button>
        ) : null}
      </div>

      {minimal && isDetailsOpen ? (
        <section
          id="service-note-optional-details"
          className="grid gap-4 rounded-xl border border-border/80 bg-muted/[0.16] p-3.5 sm:grid-cols-2"
          aria-label="Optional service details"
        >
          <FormField label="Service date" htmlFor="service-note-date" optional>
            <DateField
              id="service-note-date"
              value={form.serviceDate}
              max={todayIsoDate()}
              disabled={disabled || isSubmitting}
              onChange={(serviceDate) => setForm((current) => ({ ...current, serviceDate }))}
            />
          </FormField>
          <FormField label="Mileage" htmlFor="service-note-mileage" optional>
            <Input
              id="service-note-mileage"
              type="number"
              inputMode="numeric"
              value={form.mileage}
              disabled={disabled || isSubmitting}
              onChange={(event) => setForm((current) => ({ ...current, mileage: Number(event.target.value) }))}
            />
          </FormField>
        </section>
      ) : null}

      <FormActions className="grid grid-cols-2 pt-0 sm:flex">
        {speech.isListening ? (
          <Button
            type="button"
            className="col-span-2 h-10 rounded-xl"
            disabled={disabled || isSubmitting}
            onClick={speech.stopListening}
          >
            <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
            Stop dictation
          </Button>
        ) : speech.isSupported ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl border-primary/20 bg-primary/[0.035] text-primary hover:bg-primary/[0.08]"
            disabled={disabled || isSubmitting}
            onClick={() => {
              setCaptureChannel("voice");
              speech.startListening();
            }}
          >
            <Mic className="h-4 w-4" aria-hidden />
            {hasNoteText ? "Continue dictating" : "Dictate instead"}
          </Button>
        ) : null}
        {hasNoteText && !speech.isListening ? (
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-xl"
            disabled={disabled || isSubmitting}
            onClick={() => {
              speech.resetTranscript();
              setCaptureChannel("text");
              setStorageKey(null);
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Clear note
          </Button>
        ) : null}
      </FormActions>

      {speech.error ? <Alert variant="destructive">{speech.error}</Alert> : null}

      {!minimal ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Shop" htmlFor="service-note-shop">
            <Input
              id="service-note-shop"
              value={form.shop}
              disabled={disabled || isSubmitting}
              onChange={(event) => setForm({ ...form, shop: event.target.value })}
            />
          </FormField>
          <FormField label="Service date" htmlFor="service-note-date">
            <Input
              id="service-note-date"
              value={form.serviceDate}
              disabled={disabled || isSubmitting}
              onChange={(event) => setForm({ ...form, serviceDate: event.target.value })}
            />
          </FormField>
          <FormField label="Mileage" htmlFor="service-note-mileage">
            <Input
              id="service-note-mileage"
              type="number"
              value={form.mileage}
              disabled={disabled || isSubmitting}
              onChange={(event) => setForm({ ...form, mileage: Number(event.target.value) })}
            />
          </FormField>
          <FormField label="Total" htmlFor="service-note-total">
            <Input
              id="service-note-total"
              value={form.total}
              disabled={disabled || isSubmitting}
              onChange={(event) => setForm({ ...form, total: event.target.value })}
            />
          </FormField>
        </div>
      ) : null}

      {!minimal ? (
        <FormField label="Line items" htmlFor="service-note-lines">
          <Textarea
            id="service-note-lines"
            rows={2}
            value={form.lineItems}
            disabled={disabled || isSubmitting}
            onChange={(event) => setForm({ ...form, lineItems: event.target.value })}
          />
        </FormField>
      ) : null}

      <div
        className={
          minimal
            ? "sticky bottom-0 z-10 -mx-1 border-t border-border/70 bg-background/95 px-1 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur"
            : undefined
        }
      >
        <Button
          type="button"
          className="h-12 w-full rounded-xl text-[15px] shadow-[0_10px_22px_-14px_hsl(var(--primary)/0.7)]"
          disabled={disabled || !isOnline || isSubmitting || isUploading || speech.isListening || !hasNoteText}
          onClick={() => void submitServiceNote()}
        >
          {!isSubmitting ? <Check className="h-4 w-4" aria-hidden /> : null}
          {!isOnline ? "Reconnect to save" : isSubmitting ? "Saving service note..." : "Save service note"}
        </Button>
      </div>
    </div>
  );
}

/** @deprecated Use ServiceNotePanel for new UI surfaces. */
export const VoiceMemoryPanel = ServiceNotePanel;
