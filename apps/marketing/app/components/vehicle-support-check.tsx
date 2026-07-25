"use client";

import { useEffect, useState } from "react";

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

type CatalogVehicle = {
  make: string;
  model: string;
  year: number;
  trim: string;
  supported: boolean;
};

const defaultForm: VehicleSupportForm = {
  year: 2021,
  make: "Acura",
  model: "TLX",
  trim: "SH-AWD",
};

export function VehicleSupportCheck() {
  const [form, setForm] = useState<VehicleSupportForm>(defaultForm);
  const [status, setStatus] = useState<VehicleSupportResponse | null>(null);
  const [catalog, setCatalog] = useState<CatalogVehicle[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    void fetch("/api/catalog/vehicles")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { vehicles?: CatalogVehicle[] } | null) => {
        if (body?.vehicles) setCatalog(body.vehicles);
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

  return (
    <div className="support-check" id="supported">
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
          </>
        ) : status?.waitlist ? (
          <>
            <strong>Waitlist — pack in review</strong>
            <p>
              We recognize this vehicle but the OEM pack is not auto-verified yet. Join early access —
              track history now; schedule projection ships when your pack clears QA.
            </p>
          </>
        ) : status && !status.supported && !status.waitlist ? (
          <>
            <strong>Not in catalog yet</strong>
            <p>
              Tier 1 passenger packs are rolling out through late 2026. Early access still works for
              history, reminders, and receipts — OEM projection joins when your pack ships.
            </p>
          </>
        ) : (
          <p>Enter year, make, and model to check OEM pack support.</p>
        )}
      </div>

      {catalog.length > 0 ? (
        <div className="support-catalog">
          <p className="support-catalog-label">Catalog today ({catalog.filter((row) => row.supported).length} verified)</p>
          <ul>
            {catalog.map((row) => (
              <li key={`${row.year}-${row.make}-${row.model}-${row.trim}`}>
                <span>
                  {row.year} {row.make} {row.model} {row.trim}
                </span>
                <span className={row.supported ? "support-tag-yes" : "support-tag-waitlist"}>
                  {row.supported ? "Verified" : "In review"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
