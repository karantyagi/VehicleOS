"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type RequestVehicleDefaults = {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
};

type RequestVehiclePanelProps = {
  apiBase: string;
  source?: "onboarding" | "settings" | "marketing";
  variant?: "primary" | "fallback";
  compact?: boolean;
  defaultValues?: RequestVehicleDefaults;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

type SupportStatus = {
  supported: boolean;
  waitlist: boolean;
  qaStatus: string | null;
} | null;

const emptyDraft = (defaults?: RequestVehicleDefaults) => ({
  year: defaults?.year ? String(defaults.year) : "",
  make: defaults?.make ?? "",
  model: defaults?.model ?? "",
  trim: defaults?.trim ?? "",
  note: "",
  contactEmail: "",
});

export function RequestVehiclePanel({
  apiBase,
  source = "onboarding",
  variant = "primary",
  compact = false,
  defaultValues,
  open,
  onOpenChange,
  className,
}: RequestVehiclePanelProps) {
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isControlled ? open : internalOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const [draft, setDraft] = useState(() => emptyDraft(defaultValues));
  const [contactEmail, setContactEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ requestId: string; email: string } | null>(null);
  const [supportStatus, setSupportStatus] = useState<SupportStatus>(null);
  const [isCheckingSupport, setIsCheckingSupport] = useState(false);

  useEffect(() => {
    if (!isOpen || success) return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`${apiBase}/api/catalog/vehicle-requests`);
        if (!response.ok) return;
        const body = (await response.json()) as { contactEmail?: string | null };
        if (cancelled) return;
        if (body.contactEmail) {
          setContactEmail(body.contactEmail);
          setDraft((current) => ({ ...current, contactEmail: body.contactEmail ?? "" }));
        }
      } catch {
        // Optional autofill — ignore failures.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiBase, isOpen, success]);

  useEffect(() => {
    if (!isOpen || success) return;
    setDraft((current) => ({
      ...current,
      year: defaultValues?.year ? String(defaultValues.year) : current.year,
      make: defaultValues?.make ?? current.make,
      model: defaultValues?.model ?? current.model,
      trim: defaultValues?.trim ?? current.trim,
    }));
  }, [defaultValues?.make, defaultValues?.model, defaultValues?.trim, defaultValues?.year, isOpen, success]);

  useEffect(() => {
    if (!isOpen || success) return;

    const year = Number(draft.year);
    const make = draft.make.trim();
    const model = draft.model.trim();
    const trim = draft.trim.trim();

    if (!Number.isFinite(year) || year < 1980 || !make || !model) {
      setSupportStatus(null);
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        setIsCheckingSupport(true);
        try {
          const params = new URLSearchParams({
            year: String(year),
            make,
            model,
            trim,
          });
          const response = await fetch(`${apiBase}/api/catalog/supported?${params.toString()}`);
          const body = (await response.json()) as {
            supported?: boolean;
            waitlist?: boolean;
            qaStatus?: string | null;
          };
          if (!response.ok) {
            setSupportStatus(null);
            return;
          }
          setSupportStatus({
            supported: Boolean(body.supported),
            waitlist: Boolean(body.waitlist),
            qaStatus: body.qaStatus ?? null,
          });
        } catch {
          setSupportStatus(null);
        } finally {
          setIsCheckingSupport(false);
        }
      })();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [apiBase, draft.make, draft.model, draft.trim, draft.year, isOpen, success]);

  const statusLabel = useMemo(() => {
    if (isCheckingSupport) return "Checking catalog…";
    if (!supportStatus) return null;
    if (supportStatus.supported) return "Already supported — pick it from the dropdown above.";
    if (supportStatus.qaStatus === "creator_review_required") return "In review — request helps us prioritize your trim.";
    return "Not in catalog yet — we'll add your car to the queue.";
  }, [isCheckingSupport, supportStatus]);

  const submitRequest = async () => {
    setError("");
    setIsSubmitting(true);

    const email = (draft.contactEmail || contactEmail).trim();

    try {
      const response = await fetch(`${apiBase}/api/catalog/vehicle-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: Number(draft.year),
          make: draft.make,
          model: draft.model,
          trim: draft.trim,
          note: draft.note.trim() || undefined,
          contactEmail: email || undefined,
          source,
        }),
      });

      const body = (await response.json()) as { error?: string; requestId?: string };

      if (!response.ok) {
        setError(body.error ?? "Could not send your request. Try again.");
        return;
      }

      setSuccess({
        requestId: body.requestId ?? "sent",
        email,
      });
    } catch {
      setError("Could not send your request. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className={cn("history-surface p-4 sm:p-5", className)} role="status">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-history-highlight/15 text-lg" aria-hidden>
            ✓
          </span>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Request sent</p>
            <p className="text-sm text-muted-foreground">
              The VehicleOS team got your {draft.year} {draft.make} {draft.model}. We&apos;ll email{" "}
              <span className="font-medium text-foreground">{success.email}</span> when your car is ready.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("sm:col-span-2", className)}>
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="history-surface history-interactive flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span>
            <span className="block text-sm font-medium text-foreground">
              {variant === "fallback" ? "Already signed up?" : "Don't see your car?"}
            </span>
            {!compact ? (
              <span className="mt-0.5 block text-sm text-muted-foreground">
                {variant === "fallback"
                  ? "Request your car here — we'll email you when it's ready. Check vehicleos.app first if you haven't."
                  : "Tell us what you drive — one tap, no waitlist site."}
              </span>
            ) : (
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Request it — we&apos;ll email when it&apos;s ready.
              </span>
            )}
          </span>
          <span className="text-sm font-medium text-history-highlight" aria-hidden>
            →
          </span>
        </button>
      ) : (
        <div className="history-surface space-y-4 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">Request your vehicle</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We add verified OEM schedules in batches. Send your trim and we&apos;ll reach out by email.
              </p>
            </div>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Year</span>
              <Input
                inputMode="numeric"
                placeholder="2022"
                value={draft.year}
                onChange={(event) => setDraft({ ...draft, year: event.target.value })}
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Make</span>
              <Input
                placeholder="Honda"
                value={draft.make}
                onChange={(event) => setDraft({ ...draft, make: event.target.value })}
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Model</span>
              <Input
                placeholder="Accord"
                value={draft.model}
                onChange={(event) => setDraft({ ...draft, model: event.target.value })}
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Trim</span>
              <Input
                placeholder="Sport"
                value={draft.trim}
                onChange={(event) => setDraft({ ...draft, trim: event.target.value })}
              />
            </label>
          </div>

          {statusLabel ? (
            <p
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                supportStatus?.supported
                  ? "border border-primary/30 bg-primary/5 text-foreground"
                  : "border border-history-highlight/25 bg-history-highlight/[0.06] text-muted-foreground",
              )}
            >
              {statusLabel}
            </p>
          ) : null}

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Reply email</span>
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@email.com"
              value={draft.contactEmail || contactEmail}
              onChange={(event) => {
                setContactEmail(event.target.value);
                setDraft({ ...draft, contactEmail: event.target.value });
              }}
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">
              Anything else? <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <Textarea
              rows={2}
              placeholder="e.g. SH-AWD, 2.0T, or VIN last 8"
              value={draft.note}
              onChange={(event) => setDraft({ ...draft, note: event.target.value })}
            />
          </label>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button
            type="button"
            className="history-cta w-full sm:w-auto"
            disabled={isSubmitting || Boolean(supportStatus?.supported)}
            onClick={() => void submitRequest()}
          >
            {isSubmitting ? "Sending…" : "Send to VehicleOS team"}
          </Button>
        </div>
      )}
    </div>
  );
}
