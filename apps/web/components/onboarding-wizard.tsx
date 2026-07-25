"use client";

import { useEffect, useState } from "react";
import { DrivingStyleFields } from "@/components/driving-style-fields";
import { DateField } from "@/components/date-field";
import { FormActions, FormField } from "@/components/form-field";
import { RecordImportPanel } from "@/components/record-import-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LogoMark } from "../lib/logo-mark";
import { getApiBase } from "../lib/api-base";
import {
  buildOwnerContextWithPrimaryCity,
  parseStatedMilesPerYear,
  type DriverHabitsDraft,
} from "@/lib/driver-habits";
import { todayIsoDate } from "@/lib/date-input";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

export type OnboardingVehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  currentMileage: number;
  trim?: string;
  vin?: string;
  ownedSince?: string | null;
  drivingStyle?: "economical" | "casual" | "aggressive" | null;
  statedMilesPerYear?: number | null;
  ownerContextMemory?: {
    shopLocations?: Record<string, string>;
  };
};

type VehicleForm = {
  year: number;
  make: string;
  model: string;
  trim: string;
  vin: string;
  currentMileage: number;
  ownedSince: string;
};

type OnboardingWizardProps = {
  onComplete: (vehicle: OnboardingVehicle) => void;
};

const defaultForm: VehicleForm = {
  year: 2021,
  make: "Acura",
  model: "TLX",
  trim: "SH-AWD",
  vin: "",
  currentMileage: 58_819,
  ownedSince: "",
};

type VehicleSupportStatus = {
  supported: boolean;
  waitlist: boolean;
  qaStatus: string | null;
};

const fetchVehicleSupport = async (form: VehicleForm): Promise<VehicleSupportStatus | null> => {
  if (!form.make.trim() || !form.model.trim() || !Number.isFinite(form.year)) {
    return null;
  }

  const params = new URLSearchParams({
    year: String(form.year),
    make: form.make.trim(),
    model: form.model.trim(),
  });
  if (form.trim.trim()) {
    params.set("trim", form.trim.trim());
  }

  const response = await fetch(`/api/catalog/supported?${params.toString()}`);
  if (!response.ok) return null;
  return (await response.json()) as VehicleSupportStatus;
};

const steps = ["welcome", "car", "driver", "history"] as const;
type WizardStep = (typeof steps)[number];

const stepIndex = (step: WizardStep) => steps.indexOf(step);

const progressForStep = (step: WizardStep): number => {
  if (step === "welcome") return 0;
  if (step === "car") return 25;
  if (step === "driver") return 55;
  return 85;
};

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const apiBase = getApiBase();
  const [step, setStep] = useState<WizardStep>("welcome");
  const [form, setForm] = useState<VehicleForm>(defaultForm);
  const [driverDraft, setDriverDraft] = useState<DriverHabitsDraft>({
    drivingStyle: "casual",
    statedMilesPerYear: null,
    primaryCity: "",
  });
  const [milesInput, setMilesInput] = useState("");
  const [createdVehicle, setCreatedVehicle] = useState<OnboardingVehicle | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [supportStatus, setSupportStatus] = useState<VehicleSupportStatus | null>(null);

  useEffect(() => {
    if (step !== "car") return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void fetchVehicleSupport(form).then((status) => {
        if (!cancelled) setSupportStatus(status);
      });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [form, step]);

  const createVehicle = async (): Promise<OnboardingVehicle | null> => {
    setIsBusy(true);
    setError("");

    const parsedMiles = parseStatedMilesPerYear(milesInput);
    if (parsedMiles === "invalid") {
      setError("Enter annual mileage between 1,000 and 80,000.");
      setIsBusy(false);
      return null;
    }

    if (!form.ownedSince.trim()) {
      setError("Owned since is required — it anchors calendar reminders when receipts are missing.");
      setIsBusy(false);
      return null;
    }

    if (!driverDraft.primaryCity.trim()) {
      setError("Garage city is required — it anchors seasonal reminders and shop lookups.");
      setIsBusy(false);
      return null;
    }

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
          ownedSince: form.ownedSince.trim(),
          drivingStyle: driverDraft.drivingStyle,
          statedMilesPerYear: parsedMiles,
          ownerContextMemory: buildOwnerContextWithPrimaryCity(null, driverDraft.primaryCity),
        }),
      });

      if (!response.ok) throw new Error("Could not create vehicle");

      const body = (await response.json()) as { vehicle: OnboardingVehicle };
      setCreatedVehicle(body.vehicle);
      return body.vehicle;
    } catch {
      setError("Could not save your vehicle. Check your connection and try again.");
      return null;
    } finally {
      setIsBusy(false);
    }
  };

  const continueFromDriver = async () => {
    const vehicle = await createVehicle();
    if (vehicle) setStep("history");
  };

  const finishSetup = (vehicle: OnboardingVehicle) => {
    onComplete(vehicle);
  };

  const goBack = () => {
    if (step === "history") setStep("driver");
    else if (step === "driver") setStep("car");
    else if (step === "car") setStep("welcome");
  };

  const progress = progressForStep(step);
  const setupStepCount = steps.length - 1;

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
            Step {stepIndex(step)} of {setupStepCount}
          </p>
        )}
        <CardTitle className={cn(step === "welcome" && "text-2xl")}>
          {step === "welcome"
            ? "Set up your reminding assistant"
            : step === "car"
              ? "Vehicle record"
              : step === "driver"
                ? "Driving profile"
                : "Import history"}
        </CardTitle>
        <CardDescription className={cn(step === "welcome" && "max-w-md")}>
          {step === "welcome"
            ? "Three quick steps — vehicle record, driving profile, and import history — then your assistant workspace unlocks."
            : step === "car"
              ? "We use this to project calendar reminders — the assistant handles mileage math."
              : step === "driver"
                ? "Driving style and garage city shape preemptive nudges. Annual miles fine-tunes Schedule dates."
                : "Hand off CARFAX or portal PDFs so reminders start from your actual service history."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === "welcome" ? (
          <>
            <Button type="button" size="lg" className="w-full sm:w-auto" onClick={() => setStep("car")}>
              Set up Owner profile
            </Button>
            <ol className="grid gap-3 sm:grid-cols-3" aria-label="How setup works">
              {[
                ["01", "Vehicle record"],
                ["02", "Driving profile"],
                ["03", "Import history"],
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
                placeholder="Acura"
              />
            </FormField>
            <FormField label="Model" htmlFor="ob-model">
              <Input
                id="ob-model"
                value={form.model}
                onChange={(event) => setForm({ ...form, model: event.target.value })}
                placeholder="TLX"
              />
            </FormField>
            <FormField label="Trim" htmlFor="ob-trim" optional>
              <Input
                id="ob-trim"
                value={form.trim}
                onChange={(event) => setForm({ ...form, trim: event.target.value })}
                placeholder="SH-AWD"
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
            <FormField
              label="Owned since"
              htmlFor="ob-owned-since"
              hint="Required — anchors calendar reminders when receipts are missing"
            >
              <DateField
                id="ob-owned-since"
                value={form.ownedSince}
                max={todayIsoDate()}
                onChange={(ownedSince) => setForm({ ...form, ownedSince })}
              />
            </FormField>
            {supportStatus ? (
              <p
                className={cn(
                  "sm:col-span-2 rounded-lg border px-3 py-2 text-sm",
                  supportStatus.supported
                    ? "border-primary/30 bg-primary/5 text-foreground"
                    : "border-border bg-muted/40 text-muted-foreground",
                )}
              >
                {supportStatus.supported
                  ? "This vehicle has a verified OEM maintenance schedule — we load it automatically at setup."
                  : supportStatus.waitlist
                    ? "Not in the supported catalog yet — you can still track history; we'll notify you when your pack ships."
                    : "Checking support…"}
              </p>
            ) : null}
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

        {step === "history" && createdVehicle ? (
          <RecordImportPanel
            vehicleId={createdVehicle.id}
            apiBase={apiBase}
            ownerShopLocations={createdVehicle.ownerContextMemory?.shopLocations}
            disabled={isBusy}
            onError={(message) => notify(message, "error")}
            onCarfaxImported={(body) => {
              const skipped = body.skippedCount ?? 0;
              if (body.importedCount === 0 && skipped > 0) {
                notify(`All ${skipped} row(s) already on your timeline — nothing new imported.`, "success");
              } else if (skipped > 0) {
                notify(
                  `${body.importedCount} service row(s) imported (${skipped} duplicate(s) skipped).`,
                  "success",
                );
              } else {
                notify(`${body.importedCount} service row(s) imported.`, "success");
              }
              if (body.verificationTaskId) {
                notify("Some imported rows need verification in your assistant queue.", "success");
              }
            }}
            onRmvImported={(body) => {
              const skipped = body.skippedCount ?? 0;
              if (body.importedCount === 0 && skipped > 0) {
                notify(`All ${skipped} ownership record(s) already on file.`, "success");
              } else {
                notify(`${body.importedCount} ownership record(s) imported.`, "success");
              }
              if (body.profilePatch?.vin) {
                notify(`VIN ${body.profilePatch.vin} saved from your RMV PDF.`, "success");
              } else if (body.verificationTaskId) {
                notify("Profile conflicts from the PDF need your review in the assistant queue.", "success");
              }
            }}
          />
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
                disabled={
                  !form.make.trim() ||
                  !form.model.trim() ||
                  form.currentMileage <= 0 ||
                  !form.ownedSince.trim()
                }
                onClick={() => setStep("driver")}
              >
                Continue
              </Button>
            ) : null}
            {step === "driver" ? (
              <Button
                type="button"
                disabled={isBusy || !driverDraft.primaryCity.trim()}
                onClick={() => void continueFromDriver()}
              >
                {isBusy ? "Saving…" : "Continue"}
              </Button>
            ) : null}
            {step === "history" && createdVehicle ? (
              <>
                <Button type="button" variant="outline" disabled={isBusy} onClick={() => finishSetup(createdVehicle)}>
                  Skip for now
                </Button>
                <Button type="button" disabled={isBusy} onClick={() => finishSetup(createdVehicle)}>
                  Open assistant workspace
                </Button>
              </>
            ) : null}
          </FormActions>
        ) : null}
      </CardContent>
    </Card>
  );
}
