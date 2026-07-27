"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchCatalogVehicles,
  fetchVerifiedCatalogCount,
  formatCatalogTrimOptionLabel,
  listCatalogMakes,
  listCatalogModels,
  listCatalogTrimRows,
  listCatalogYears,
  type CatalogVehicleRow,
} from "../../lib/catalog-cascade";
import { siteConfig } from "../../lib/site-config";

type VehicleSupportResponse = {
  supported: boolean;
  waitlist: boolean;
  packId: string | null;
  qaStatus: string | null;
  supportTier: string | null;
  scheduleSourceLine?: string | null;
  error?: string;
};

export function VehicleSupportCheck() {
  const [catalog, setCatalog] = useState<CatalogVehicleRow[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [selectedPackId, setSelectedPackId] = useState("");
  const [status, setStatus] = useState<VehicleSupportResponse | null>(null);
  const [verifiedCount, setVerifiedCount] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [note, setNote] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<{ email: string } | null>(null);

  const selectedRow = useMemo(
    () => catalog.find((row) => row.packId === selectedPackId) ?? null,
    [catalog, selectedPackId],
  );

  const makes = useMemo(() => listCatalogMakes(catalog), [catalog]);
  const models = useMemo(() => listCatalogModels(catalog, make), [catalog, make]);
  const years = useMemo(() => listCatalogYears(catalog, make, model), [catalog, make, model]);
  const trimRows = useMemo(
    () => (typeof year === "number" ? listCatalogTrimRows(catalog, make, model, year) : []),
    [catalog, make, model, year],
  );

  const isVehicleComplete = Boolean(selectedRow);

  useEffect(() => {
    void fetchVerifiedCatalogCount()
      .then(setVerifiedCount)
      .catch(() => undefined);

    void fetchCatalogVehicles()
      .then((rows) => {
        setCatalog(rows);
        setCatalogError("");
      })
      .catch(() => {
        setCatalogError("Could not load the vehicle catalog. Refresh and try again.");
      });
  }, []);

  useEffect(() => {
    if (!selectedRow) {
      setStatus(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsChecking(true);
      try {
        const params = new URLSearchParams({
          year: String(selectedRow.year),
          make: selectedRow.make,
          model: selectedRow.model,
          trim: selectedRow.trim,
        });

        const response = await fetch(`/api/catalog/supported?${params.toString()}`);
        const body = (await response.json()) as VehicleSupportResponse;
        if (!cancelled) {
          setStatus({
            ...body,
            scheduleSourceLine: selectedRow.scheduleSourceLine ?? body.scheduleSourceLine ?? null,
          });
        }
      } catch {
        if (!cancelled) setStatus(null);
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [selectedRow]);

  const canRequest = Boolean(status) && !status?.supported && isVehicleComplete && !requestSuccess;

  const submitRequest = async () => {
    if (!selectedRow) return;

    setRequestError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/catalog/vehicle-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: selectedRow.year,
          make: selectedRow.make,
          model: selectedRow.model,
          trim: selectedRow.trim,
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

  const handleMakeChange = (nextMake: string) => {
    setMake(nextMake);
    setModel("");
    setYear("");
    setSelectedPackId("");
    setRequestSuccess(null);
    setRequestError("");
  };

  const handleModelChange = (nextModel: string) => {
    setModel(nextModel);
    setYear("");
    setSelectedPackId("");
    setRequestSuccess(null);
    setRequestError("");
  };

  const handleYearChange = (nextYear: number) => {
    setYear(nextYear);
    setSelectedPackId("");
    setRequestSuccess(null);
    setRequestError("");
  };

  const handleTrimChange = (packId: string) => {
    setSelectedPackId(packId);
    setRequestSuccess(null);
    setRequestError("");
  };

  const requestForm = canRequest ? (
    <div className="support-request support-request-inline">
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
        disabled={isSubmitting || !contactEmail.trim()}
        onClick={() => void submitRequest()}
      >
        {isSubmitting ? "Sending…" : "Send to VehicleOS team"}
      </button>
    </div>
  ) : null;

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

      {catalogError ? <p className="support-check-error">{catalogError}</p> : null}

      <div className="support-check-form">
        <label className="support-field">
          <span>Make</span>
          <select
            value={make}
            disabled={makes.length === 0}
            aria-label="Vehicle make"
            onChange={(event) => handleMakeChange(event.target.value)}
          >
            <option value="">Select make</option>
            {makes.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label className="support-field">
          <span>Model</span>
          <select
            value={model}
            disabled={!make || models.length === 0}
            aria-label="Vehicle model"
            onChange={(event) => handleModelChange(event.target.value)}
          >
            <option value="">Select model</option>
            {models.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label className="support-field">
          <span>Year</span>
          <select
            value={year}
            disabled={!model || years.length === 0}
            aria-label="Vehicle year"
            onChange={(event) => handleYearChange(Number(event.target.value))}
          >
            <option value="">Select year</option>
            {years.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label className="support-field">
          <span>Trim</span>
          <select
            value={selectedPackId}
            disabled={!year || trimRows.length === 0}
            aria-label="Vehicle trim"
            onChange={(event) => handleTrimChange(event.target.value)}
          >
            <option value="">Select trim</option>
            {trimRows.map((row) => (
              <option key={row.packId} value={row.packId}>
                {formatCatalogTrimOptionLabel(row)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        className={`support-result ${status?.supported ? "support-result-yes" : status && !status.supported ? "support-result-waitlist" : "support-result-neutral"}`}
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
            {status.scheduleSourceLine ? (
              <p className="support-result-source">{status.scheduleSourceLine}</p>
            ) : null}
            <div className="support-result-actions">
              <a className="btn btn-primary support-result-cta" href={siteConfig.appUrl}>
                Open the app — get early access
              </a>
            </div>
          </>
        ) : status?.waitlist && selectedRow ? (
          <>
            <strong>In review — not open for setup yet</strong>
            <p>
              We recognize this vehicle but the OEM pack is not auto-verified yet. Request it below
              and we&apos;ll email you when setup unlocks.
            </p>
            {requestForm}
          </>
        ) : status && !status.supported && selectedRow ? (
          <>
            <strong>Not in catalog yet</strong>
            <p>
              Tier 1 and Tier 2 passenger packs are rolling out through late 2026. Request your trim
              below — we&apos;ll prioritize from owner demand.
            </p>
            {requestForm}
          </>
        ) : (
          <p>Select make, model, year, and trim to check OEM pack support.</p>
        )}
      </div>

      {requestSuccess && selectedRow ? (
        <div className="support-request support-request-success" role="status">
          <strong>Request sent</strong>
          <p>
            We got your {selectedRow.year} {selectedRow.make} {selectedRow.model} {selectedRow.trim}.
            We&apos;ll email{" "}
            <span className="support-request-email">{requestSuccess.email}</span> when your car is ready.
          </p>
        </div>
      ) : null}
    </div>
  );
}
