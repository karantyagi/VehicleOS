"use client";

import { useEffect, useState } from "react";
import { siteConfig } from "../../lib/site-config";

type VehicleSupportForm = {
  year: number;
  make: string;
  model: string;
  trim: string;
};

type VehicleSupportResponse = {
  supported: boolean;
  waitlist: boolean;
  packId: string | null;
  qaStatus: string | null;
  supportTier: string | null;
  error?: string;
};

const defaultForm: VehicleSupportForm = {
  year: 2021,
  make: "",
  model: "",
  trim: "",
};

export function VehicleSupportCheck() {
  const [form, setForm] = useState<VehicleSupportForm>(defaultForm);
  const [status, setStatus] = useState<VehicleSupportResponse | null>(null);
  const [verifiedCount, setVerifiedCount] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [note, setNote] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<{ email: string } | null>(null);

  useEffect(() => {
    void fetch("/api/catalog/vehicles?verifiedOnly=true&limit=1")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { total?: number; vehicles?: { supported?: boolean }[] } | null) => {
        if (!body) return;
        if (typeof body.total === "number") {
          setVerifiedCount(body.total);
          return;
        }
        if (body.vehicles) {
          setVerifiedCount(body.vehicles.filter((row) => row.supported).length);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!form.make.trim() || !form.model.trim() || !Number.isFinite(form.year)) {
      setStatus(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsChecking(true);
      try {
        const params = new URLSearchParams({
          year: String(form.year),
          make: form.make.trim(),
          model: form.model.trim(),
        });
        if (form.trim.trim()) params.set("trim", form.trim.trim());

        const response = await fetch(`/api/catalog/supported?${params.toString()}`);
        const body = (await response.json()) as VehicleSupportResponse;
        if (!cancelled) setStatus(body);
      } catch {
        if (!cancelled) setStatus(null);
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [form]);

  const canRequest =
    Boolean(status) &&
    !status?.supported &&
    form.trim.trim().length > 0 &&
    !requestSuccess;

  const submitRequest = async () => {
    setRequestError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/catalog/vehicle-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: form.year,
          make: form.make.trim(),
          model: form.model.trim(),
          trim: form.trim.trim(),
          note: note.trim() || undefined,
          contactEmail: contactEmail.trim(),
          source: "marketing",
        }),
      });

      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        setRequestError(body.error ?? "Could not send your request. Try again.");
        return;
      }

      setRequestSuccess({ email: contactEmail.trim() });
    } catch {
      setRequestError("Could not send your request. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="support-check" id="supported">
      <div className="support-check-header">
        <div>
          <p className="support-check-eyebrow">Compatibility check</p>
          <h3 className="support-check-title">Is your car supported today?</h3>
        </div>
        {verifiedCount !== null ? (
          <p className="support-check-meta">
            {verifiedCount} verified {verifiedCount === 1 ? "model" : "models"} in early access
          </p>
        ) : null}
      </div>

      <div className="support-check-form">
        <label className="support-field">
          <span>Year</span>
          <input
            type="number"
            min={1980}
            max={new Date().getFullYear() + 1}
            value={form.year}
            onChange={(event) => setForm({ ...form, year: Number(event.target.value) })}
          />
        </label>
        <label className="support-field">
          <span>Make</span>
          <input
            value={form.make}
            onChange={(event) => setForm({ ...form, make: event.target.value })}
            placeholder="Acura"
          />
        </label>
        <label className="support-field">
          <span>Model</span>
          <input
            value={form.model}
            onChange={(event) => setForm({ ...form, model: event.target.value })}
            placeholder="TLX"
          />
        </label>
        <label className="support-field">
          <span>Trim</span>
          <input
            value={form.trim}
            onChange={(event) => setForm({ ...form, trim: event.target.value })}
            placeholder="SH-AWD"
          />
        </label>
      </div>

      <div
        className={`support-result ${status?.supported ? "support-result-yes" : status?.waitlist ? "support-result-waitlist" : "support-result-neutral"}`}
        aria-live="polite"
      >
        {isChecking && !status ? (
          <p>Checking catalog…</p>
        ) : status?.supported ? (
          <>
            <strong>Supported today</strong>
            <p>
              Verified OEM maintenance schedule loads automatically at setup — no manual PDF upload.
            </p>
            <div className="support-result-actions">
              <a className="btn btn-primary support-result-cta" href={siteConfig.appUrl}>
                Open the app — get early access
              </a>
            </div>
          </>
        ) : status?.waitlist ? (
          <>
            <strong>In review — not open for setup yet</strong>
            <p>
              We recognize this vehicle but the OEM pack is not auto-verified yet. Request it below
              and we&apos;ll email you when setup unlocks.
            </p>
          </>
        ) : status && !status.supported && !status.waitlist ? (
          <>
            <strong>Not in catalog yet</strong>
            <p>
              Tier 1 and Tier 2 passenger packs are rolling out through late 2026. Request your trim
              below — we&apos;ll prioritize from owner demand.
            </p>
          </>
        ) : (
          <p>Enter year, make, model, and trim to check OEM pack support.</p>
        )}
      </div>

      {requestSuccess ? (
        <div className="support-request support-request-success" role="status">
          <strong>Request sent</strong>
          <p>
            We got your {form.year} {form.make} {form.model} {form.trim}. We&apos;ll email{" "}
            <span className="support-request-email">{requestSuccess.email}</span> when your car is ready.
          </p>
        </div>
      ) : canRequest ? (
        <div className="support-request">
          <p className="support-request-label">Request this vehicle</p>
          <div className="support-request-fields">
            <label className="support-field support-field-full">
              <span>Reply email</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@email.com"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
              />
            </label>
            <label className="support-field support-field-full">
              <span>
                Anything else? <span className="support-field-optional">(optional)</span>
              </span>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="e.g. SH-AWD, 2.0T"
              />
            </label>
          </div>
          {requestError ? <p className="support-request-error">{requestError}</p> : null}
          <button
            type="button"
            className="btn btn-primary support-request-submit"
            disabled={isSubmitting}
            onClick={() => void submitRequest()}
          >
            {isSubmitting ? "Sending…" : "Send to VehicleOS team"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
