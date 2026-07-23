"use client";

import { useMemo, useState } from "react";
import { FormActions, FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LogoMark } from "../lib/logo-mark";
import { getApiBase } from "../lib/api-base";
import { cn } from "@/lib/utils";

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

const steps = ["welcome", "details", "review"] as const;
type WizardStep = (typeof steps)[number];

const stepIndex = (step: WizardStep) => steps.indexOf(step);

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
      onComplete(body.vehicle);
    } catch {
      setError("Could not save your vehicle. Check your connection and try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const progress = step === "welcome" ? 0 : step === "details" ? 50 : 100;

  return (
    <Card className="overflow-hidden border-border/80 shadow-md">
      {step !== "welcome" ? (
        <div className="h-1 bg-muted">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      <CardHeader className={cn(step === "welcome" && "items-center text-center pb-2")}>
        {step === "welcome" ? (
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <LogoMark />
          </div>
        ) : (
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Step {stepIndex(step)} of {steps.length - 1}
          </p>
        )}
        <CardTitle className={cn(step === "welcome" && "text-2xl")}>
          {step === "welcome"
            ? "Start your ownership timeline"
            : step === "details"
              ? "Tell us about your vehicle"
              : "Review and save"}
        </CardTitle>
        <CardDescription className={cn(step === "welcome" && "max-w-md")}>
          {step === "welcome"
            ? "One place for receipts, reminders, and plain-English answers — you confirm before anything changes."
            : step === "details"
              ? "We use this to build your timeline and mileage-aware reminders."
              : "Confirm your vehicle details. You can add receipts from the Receipts section next."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === "welcome" ? (
          <>
            <Button type="button" size="lg" className="w-full sm:w-auto" onClick={() => setStep("details")}>
              Add your first vehicle
            </Button>
            <ol className="grid gap-3 sm:grid-cols-3" aria-label="How it works">
              {[
                ["01", "Add car"],
                ["02", "Confirm receipt"],
                ["03", "See what's due"],
              ].map(([num, label]) => (
                <li key={num} className="rounded-lg border border-border bg-muted/30 px-3 py-3 text-sm">
                  <span className="font-mono text-xs text-primary">{num}</span>
                  <span className="mt-1 block font-medium">{label}</span>
                </li>
              ))}
            </ol>
          </>
        ) : null}

        {step === "details" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Year" htmlFor="ob-year">
              <Input
                id="ob-year"
                type="number"
                min={1980}
                max={new Date().getFullYear() + 1}
                value={form.year}
                onChange={(event) => setForm({ ...form, year: Number(event.target.value) })}
              />
            </FormField>
            <FormField label="Make" htmlFor="ob-make">
              <Input
                id="ob-make"
                value={form.make}
                onChange={(event) => setForm({ ...form, make: event.target.value })}
                placeholder="Honda"
              />
            </FormField>
            <FormField label="Model" htmlFor="ob-model">
              <Input
                id="ob-model"
                value={form.model}
                onChange={(event) => setForm({ ...form, model: event.target.value })}
                placeholder="Civic"
              />
            </FormField>
            <FormField label="Trim" htmlFor="ob-trim" optional>
              <Input
                id="ob-trim"
                value={form.trim}
                onChange={(event) => setForm({ ...form, trim: event.target.value })}
                placeholder="EX"
              />
            </FormField>
            <FormField label="Current mileage" htmlFor="ob-mileage">
              <Input
                id="ob-mileage"
                type="number"
                min={0}
                value={form.currentMileage}
                onChange={(event) => setForm({ ...form, currentMileage: Number(event.target.value) })}
              />
            </FormField>
            <FormField label="VIN" htmlFor="ob-vin" optional hint="Last 8 characters is fine for early access">
              <Input
                id="ob-vin"
                value={form.vin}
                onChange={(event) => setForm({ ...form, vin: event.target.value })}
              />
            </FormField>
          </div>
        ) : null}

        {step === "review" ? (
          <dl className="space-y-3 rounded-lg border border-border bg-muted/20 p-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Vehicle</dt>
              <dd className="font-medium">{vehicleLabel}</dd>
            </div>
            {form.vin.trim() ? (
              <div>
                <dt className="text-muted-foreground">VIN</dt>
                <dd className="font-medium">{form.vin.trim()}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {step !== "welcome" ? (
          <FormActions>
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={() => setStep(step === "review" ? "details" : "welcome")}
            >
              Back
            </Button>
            {step === "details" ? (
              <Button
                type="button"
                disabled={!form.make.trim() || !form.model.trim() || form.currentMileage <= 0}
                onClick={() => setStep("review")}
              >
                Continue
              </Button>
            ) : (
              <Button type="button" disabled={isBusy} onClick={() => void createVehicle()}>
                {isBusy ? "Saving…" : "Save vehicle"}
              </Button>
            )}
          </FormActions>
        ) : null}
      </CardContent>
    </Card>
  );
}
