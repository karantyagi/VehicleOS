"use client";

import { useMemo, useState } from "react";
import { DrivingStyleFields } from "@/components/driving-style-fields";
import { FormActions, FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LogoMark } from "../lib/logo-mark";
import { getApiBase } from "../lib/api-base";
import {
  parseStatedMilesPerYear,
  saveDriverHabits,
  type DriverHabitsDraft,
} from "@/lib/driver-habits";
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

const steps = ["welcome", "car", "driver", "review"] as const;
type WizardStep = (typeof steps)[number];

const stepIndex = (step: WizardStep) => steps.indexOf(step);

const progressForStep = (step: WizardStep): number => {
  if (step === "welcome") return 0;
  if (step === "car") return 25;
  if (step === "driver") return 55;
  return 100;
};

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const apiBase = getApiBase();
  const [step, setStep] = useState<WizardStep>("welcome");
  const [form, setForm] = useState<VehicleForm>(defaultForm);
  const [driverDraft, setDriverDraft] = useState<DriverHabitsDraft>({
    drivingStyle: "casual",
    statedMilesPerYear: null,
  });
  const [milesInput, setMilesInput] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  const vehicleLabel = useMemo(
    () =>
      `${form.year} ${form.make} ${form.model}${form.trim ? ` ${form.trim}` : ""} · ${form.currentMileage.toLocaleString()} mi`,
    [form],
  );

  const drivingStyleLabel = useMemo(() => {
    const labels: Record<DriverHabitsDraft["drivingStyle"], string> = {
      economical: "Economical",
      casual: "Casual",
      aggressive: "Aggressive",
    };
    return labels[driverDraft.drivingStyle];
  }, [driverDraft.drivingStyle]);

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
      const parsedMiles = parseStatedMilesPerYear(milesInput);
      if (parsedMiles === "invalid") {
        setError("Enter annual mileage between 1,000 and 80,000.");
        return;
      }
      saveDriverHabits(body.vehicle.id, {
        drivingStyle: driverDraft.drivingStyle,
        statedMilesPerYear: parsedMiles,
      });
      onComplete(body.vehicle);
    } catch {
      setError("Could not save your vehicle. Check your connection and try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const goBack = () => {
    if (step === "review") setStep("driver");
    else if (step === "driver") setStep("car");
    else if (step === "car") setStep("welcome");
  };

  const progress = progressForStep(step);

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
            : step === "car"
              ? "Tell us about your car"
              : step === "driver"
                ? "How do you drive?"
                : "Review and finish setup"}
        </CardTitle>
        <CardDescription className={cn(step === "welcome" && "max-w-md")}>
          {step === "welcome"
            ? "Two quick steps — car and driver — then your workspace unlocks."
            : step === "car"
              ? "We use this to project calendar reminders — the assistant handles mileage math."
              : step === "driver"
                ? "Driving style shapes preemptive nudges. Annual miles fine-tunes Schedule dates."
                : "Confirm everything looks right, then open your workspace."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === "welcome" ? (
          <>
            <Button type="button" size="lg" className="w-full sm:w-auto" onClick={() => setStep("car")}>
              Set up car & driver
            </Button>
            <ol className="grid gap-3 sm:grid-cols-3" aria-label="How setup works">
              {[
                ["01", "Vehicle record"],
                ["02", "Driving profile"],
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

        {step === "car" ? (
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

        {step === "driver" ? (
          <DrivingStyleFields
            draft={driverDraft}
            milesInput={milesInput}
            onDraftChange={setDriverDraft}
            onMilesInputChange={setMilesInput}
          />
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
            <div>
              <dt className="text-muted-foreground">Driving style</dt>
              <dd className="font-medium">{drivingStyleLabel}</dd>
            </div>
            {milesInput.trim() ? (
              <div>
                <dt className="text-muted-foreground">Annual miles</dt>
                <dd className="font-medium">{Number(milesInput).toLocaleString()} mi/year</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {step !== "welcome" ? (
          <FormActions>
            <Button type="button" variant="outline" disabled={isBusy} onClick={goBack}>
              Back
            </Button>
            {step === "car" ? (
              <Button
                type="button"
                disabled={!form.make.trim() || !form.model.trim() || form.currentMileage <= 0}
                onClick={() => setStep("driver")}
              >
                Continue
              </Button>
            ) : null}
            {step === "driver" ? (
              <Button type="button" onClick={() => setStep("review")}>
                Continue
              </Button>
            ) : null}
            {step === "review" ? (
              <Button type="button" disabled={isBusy} onClick={() => void createVehicle()}>
                {isBusy ? "Saving…" : "Finish setup"}
              </Button>
            ) : null}
          </FormActions>
        ) : null}
      </CardContent>
    </Card>
  );
}
