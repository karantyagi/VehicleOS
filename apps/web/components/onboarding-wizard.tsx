"use client";

import { useMemo, useState } from "react";
import { LogoMark } from "../lib/logo-mark";
import { getApiBase } from "../lib/api-base";

export type OnboardingVehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  currentMileage: number;
  trim?: string;
  vin?: string;
};

type VehicleForm = {
  year: number;
  make: string;
  model: string;
  trim: string;
  vin: string;
  currentMileage: number;
};

type OnboardingWizardProps = {
  onComplete: (vehicle: OnboardingVehicle) => void;
};

const defaultForm: VehicleForm = {
  year: 2019,
  make: "Honda",
  model: "Civic",
  trim: "",
  vin: "",
  currentMileage: 41_800,
};

const steps = ["welcome", "details", "review", "done"] as const;
type WizardStep = (typeof steps)[number];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const apiBase = getApiBase();
  const [step, setStep] = useState<WizardStep>("welcome");
  const [form, setForm] = useState<VehicleForm>(defaultForm);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  const vehicleLabel = useMemo(
    () =>
      `${form.year} ${form.make} ${form.model}${form.trim ? ` ${form.trim}` : ""} · ${form.currentMileage.toLocaleString()} mi`,
    [form],
  );

  const createVehicle = async () => {
    setIsBusy(true);
    setError("");

    try {
      const response = await fetch(`${apiBase}/api/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vin: form.vin.trim() || undefined,
          year: Number(form.year),
          make: form.make.trim(),
          model: form.model.trim(),
          trim: form.trim.trim() || undefined,
          currentMileage: Number(form.currentMileage),
        }),
      });

      if (!response.ok) throw new Error("Could not create vehicle");

      const body = (await response.json()) as { vehicle: OnboardingVehicle };
      setStep("done");
      onComplete(body.vehicle);
    } catch {
      setError("Could not save your vehicle. Check your connection and try again.");
    } finally {
      setIsBusy(false);
    }
  };

  if (step === "welcome") {
    return (
      <section className="onboarding-welcome">
        <div className="onboarding-mark" aria-hidden="true">
          <LogoMark />
        </div>
        <p className="onboarding-eyebrow">Your car, remembered</p>
        <h1>Start your ownership timeline</h1>
        <p>
          One place for receipts, reminders, and plain-English answers — you confirm before
          anything changes.
        </p>
        <button type="button" className="primary-button" onClick={() => setStep("details")}>
          Add your first vehicle
        </button>
        <ol className="onboarding-steps" aria-label="How it works">
          <li>
            <span>01</span> Add car
          </li>
          <li>
            <span>02</span> Confirm receipt
          </li>
          <li>
            <span>03</span> See what&apos;s due
          </li>
        </ol>
      </section>
    );
  }

  if (step === "details") {
    return (
      <section className="onboarding-panel">
        <p className="eyebrow">Step 1 of 2</p>
        <h1>Tell us about your vehicle</h1>
        <p>We use this to build your timeline and mileage-aware reminders.</p>

        <div className="onboarding-form">
          <label>
            Year
            <input
              type="number"
              min={1980}
              max={new Date().getFullYear() + 1}
              value={form.year}
              onChange={(event) => setForm({ ...form, year: Number(event.target.value) })}
            />
          </label>
          <label>
            Make
            <input
              value={form.make}
              onChange={(event) => setForm({ ...form, make: event.target.value })}
              placeholder="Honda"
            />
          </label>
          <label>
            Model
            <input
              value={form.model}
              onChange={(event) => setForm({ ...form, model: event.target.value })}
              placeholder="Civic"
            />
          </label>
          <label>
            Trim <span className="optional">optional</span>
            <input
              value={form.trim}
              onChange={(event) => setForm({ ...form, trim: event.target.value })}
              placeholder="EX"
            />
          </label>
          <label>
            Current mileage
            <input
              type="number"
              min={0}
              value={form.currentMileage}
              onChange={(event) =>
                setForm({ ...form, currentMileage: Number(event.target.value) })
              }
            />
          </label>
          <label>
            VIN <span className="optional">optional</span>
            <input
              value={form.vin}
              onChange={(event) => setForm({ ...form, vin: event.target.value })}
              placeholder="Last 8 characters is fine for early access"
            />
          </label>
        </div>

        <div className="onboarding-actions">
          <button type="button" className="secondary-button" onClick={() => setStep("welcome")}>
            Back
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!form.make.trim() || !form.model.trim() || form.currentMileage <= 0}
            onClick={() => setStep("review")}
          >
            Continue
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="onboarding-panel">
      <p className="eyebrow">Step 2 of 2</p>
      <h1>Review and save</h1>
      <p>Confirm your vehicle details. You can add receipts and run the golden path next.</p>

      <dl className="onboarding-review">
        <div>
          <dt>Vehicle</dt>
          <dd>{vehicleLabel}</dd>
        </div>
        {form.vin.trim() ? (
          <div>
            <dt>VIN</dt>
            <dd>{form.vin.trim()}</dd>
          </div>
        ) : null}
      </dl>

      {error ? <p className="settings-error">{error}</p> : null}

      <div className="onboarding-actions">
        <button
          type="button"
          className="secondary-button"
          disabled={isBusy}
          onClick={() => setStep("details")}
        >
          Back
        </button>
        <button type="button" className="primary-button" disabled={isBusy} onClick={createVehicle}>
          {isBusy ? "Saving…" : "Save vehicle"}
        </button>
      </div>
    </section>
  );
}
