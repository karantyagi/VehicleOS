"use client";

import { useEffect, useMemo, useState } from "react";
import { DrivingStyleFields } from "@/components/driving-style-fields";
import { DateField } from "@/components/date-field";
import { FormActions, FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { VehicleYmmPicker } from "@/components/vehicle-ymm-picker";
import { LogoMark } from "../lib/logo-mark";
import { getApiBase } from "../lib/api-base";
import {
  buildOwnerContextWithPrimaryCity,
  parseStatedMilesPerYear,
  type DriverHabitsDraft,
} from "@/lib/driver-habits";
import { todayIsoDate } from "@/lib/date-input";
import {
  fetchVerifiedCatalogVehicles,
  formatCatalogVehicleLabel,
  type CatalogVehicleRow,
} from "@/lib/supported-vehicle-catalog";
import { RequestVehiclePanel } from "@/components/request-vehicle-panel";

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
    maintenancePatterns?: Record<
      string,
      { timing: "early" | "late"; reason: string; confirmedAt: string }
    >;
  };
};

type VehicleForm = {
  packId: string;
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
  mode?: "first" | "additional";
  onCancel?: () => void;
  prefillDogfood?: boolean;
};

const DOGFOOD_PACK_ID = "acura-tlx-2021-sh-awd";

const emptyVehicleForm = (): VehicleForm => ({
  packId: "",
  year: 0,
  make: "",
  model: "",
  trim: "",
  vin: "",
  currentMileage: 0,
  ownedSince: "",
});

const vehicleFormFromCatalog = (
  row: CatalogVehicleRow,
  prefillDogfood: boolean,
): VehicleForm => ({
  packId: row.packId,
  year: row.year,
  make: row.make,
  model: row.model,
  trim: row.trim,
  vin: "",
  currentMileage:
    prefillDogfood && row.packId === DOGFOOD_PACK_ID ? 58_819 : 0,
  ownedSince: "",
});

const steps = ["setup", "ready"] as const;
type WizardStep = (typeof steps)[number];

const stepIndex = (step: WizardStep) => steps.indexOf(step);

const progressForStep = (step: WizardStep): number => (step === "setup" ? 45 : 100);

const stepMeta = (
  step: WizardStep,
  mode: "first" | "additional",
): { title: string; description?: string } => {
  if (step === "setup") {
    return mode === "additional"
      ? { title: "Add a vehicle", description: "~2 min · separate maintenance history and attention." }
      : { title: "Your car", description: "~2 min · then Home shows what matters." };
  }
  return mode === "additional"
    ? { title: "Ready", description: "Switch to this vehicle anytime in the menu." }
    : { title: "You're set", description: "OEM schedule loaded. Add CARFAX anytime from Add records." };
};

export function OnboardingWizard({
  onComplete,
  mode = "first",
  onCancel,
  prefillDogfood = false,
}: OnboardingWizardProps) {
  const apiBase = getApiBase();
  const [step, setStep] = useState<WizardStep>("setup");
  const [form, setForm] = useState<VehicleForm>(emptyVehicleForm);
  const [catalog, setCatalog] = useState<CatalogVehicleRow[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [requestPanelOpen, setRequestPanelOpen] = useState(false);
  const [catalogLoadAttempt, setCatalogLoadAttempt] = useState(0);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [driverDraft, setDriverDraft] = useState<DriverHabitsDraft>({
    drivingStyle: "casual",
    statedMilesPerYear: null,
    primaryCity: "",
  });
  const [milesInput, setMilesInput] = useState("");
  const [createdVehicle, setCreatedVehicle] = useState<OnboardingVehicle | null>(null);
  const [oemEntriesLoaded, setOemEntriesLoaded] = useState<number | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (step !== "setup" || catalog.length > 0) return;

    let cancelled = false;
    setIsCatalogLoading(true);
    setCatalogError("");

    void fetchVerifiedCatalogVehicles(apiBase)
      .then((rows) => {
        if (cancelled) return;
        setCatalog(rows);
        if (!prefillDogfood) return;
        const defaultRow = rows.find((row) => row.packId === DOGFOOD_PACK_ID);
        if (defaultRow) {
          setForm((current) =>
            current.packId ? current : vehicleFormFromCatalog(defaultRow, true),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalogError("Could not load vehicles. Retry.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiBase, catalog.length, prefillDogfood, step, catalogLoadAttempt]);

  const retryCatalogLoad = () => {
    setCatalog([]);
    setCatalogError("");
    setCatalogLoadAttempt((attempt) => attempt + 1);
  };

  const selectedVehicle = useMemo(
    () => catalog.find((row) => row.packId === form.packId) ?? null,
    [catalog, form.packId],
  );

  const selectVehicle = (row: CatalogVehicleRow | null) => {
    if (!row) {
      setForm((current) => ({
        ...current,
        packId: "",
        year: 0,
        make: "",
        model: "",
        trim: "",
      }));
      return;
    }

    setForm((current) => ({
      ...vehicleFormFromCatalog(row, prefillDogfood),
      vin: current.vin,
      ownedSince: current.ownedSince,
      currentMileage:
        current.packId === row.packId && current.currentMileage > 0
          ? current.currentMileage
          : vehicleFormFromCatalog(row, prefillDogfood).currentMileage,
    }));
  };

  const createVehicle = async (): Promise<OnboardingVehicle | null> => {
    setIsBusy(true);
    setError("");

    const parsedMiles = parseStatedMilesPerYear(milesInput);
    if (parsedMiles === "invalid") {
      setError("Annual miles: 1,000–80,000.");
      setIsBusy(false);
      return null;
    }

    if (!selectedVehicle) {
      setError("Pick a vehicle.");
      setIsBusy(false);
      return null;
    }

    if (!form.ownedSince.trim()) {
      setError("Owned since is required.");
      setIsBusy(false);
      return null;
    }

    if (!driverDraft.primaryCity.trim()) {
      setError("Home city is required.");
      setIsBusy(false);
      return null;
    }

    if (form.currentMileage <= 0) {
      setError("Enter current mileage.");
      setIsBusy(false);
      return null;
    }

    try {
      const response = await fetch(`${apiBase}/api/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vin: form.vin.trim() || undefined,
          year: form.year,
          make: form.make,
          model: form.model,
          trim: form.trim,
          currentMileage: Number(form.currentMileage),
          ownedSince: form.ownedSince.trim(),
          drivingStyle: driverDraft.drivingStyle,
          statedMilesPerYear: parsedMiles,
          ownerContextMemory: buildOwnerContextWithPrimaryCity(null, driverDraft.primaryCity),
        }),
      });

      const body = (await response.json()) as {
        vehicle?: OnboardingVehicle;
        oemPack?: { hydrated?: boolean; entriesRecorded?: number; packId?: string };
        error?: string;
        code?: string;
      };

      if (!response.ok) {
        if (body.code === "waitlist_required") {
          setError(body.error ?? "Not in early access yet — request below.");
          setRequestPanelOpen(true);
        } else if (body.code === "vehicle_limit_reached") {
          setError(body.error ?? "Free early access: up to 2 vehicles.");
        } else {
          setError(body.error ?? "Could not save.");
        }
        return null;
      }

      if (!body.vehicle) {
        setError("Could not save.");
        return null;
      }

      setCreatedVehicle(body.vehicle);
      if (body.oemPack?.hydrated) {
        setOemEntriesLoaded(body.oemPack.entriesRecorded ?? 0);
      }
      return body.vehicle;
    } catch {
      setError("Connection error — try again.");
      return null;
    } finally {
      setIsBusy(false);
    }
  };

  const continueFromSetup = async () => {
    const vehicle = await createVehicle();
    if (vehicle) setStep("ready");
  };

  const finishSetup = () => {
    if (!createdVehicle) return;
    onComplete(createdVehicle);
  };

  const goBack = () => {
    if (step === "ready") setStep("setup");
    else if (step === "setup" && mode === "additional") onCancel?.();
  };

  const progress = progressForStep(step);
  const { title, description } = stepMeta(step, mode);
  const stepNumber = stepIndex(step) + 1;
  const showBack = step === "ready" || mode === "additional";

  const setupComplete =
    Boolean(form.packId) &&
    form.currentMileage > 0 &&
    form.ownedSince.trim().length > 0 &&
    driverDraft.primaryCity.trim().length > 0;

  return (
    <Card className="overflow-hidden border-border/80 shadow-md">
      <div className="h-1 bg-muted">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          {mode === "first" && step === "setup" ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <LogoMark />
            </div>
          ) : null}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              Step {stepNumber} of {steps.length}
            </p>
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === "setup" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Vehicle" htmlFor="ob-vehicle-make" className="sm:col-span-2">
                <VehicleYmmPicker
                  vehicles={catalog}
                  value={form.packId}
                  disabled={isCatalogLoading || catalog.length === 0}
                  onSelect={selectVehicle}
                />
              </FormField>

              {selectedVehicle ? (
                <p className="sm:col-span-2 text-xs text-muted-foreground">
                  OEM schedule loads for {formatCatalogVehicleLabel(selectedVehicle)}.
                </p>
              ) : null}

              <FormField label="Mileage" htmlFor="ob-mileage">
                <Input
                  id="ob-mileage"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="Odometer"
                  value={form.currentMileage || ""}
                  onChange={(event) => setForm({ ...form, currentMileage: Number(event.target.value) })}
                />
              </FormField>
              <FormField label="VIN" htmlFor="ob-vin" optional>
                <Input
                  id="ob-vin"
                  placeholder="Last 8 OK"
                  value={form.vin}
                  onChange={(event) => setForm({ ...form, vin: event.target.value })}
                />
              </FormField>
              <FormField
                label="Owned since"
                htmlFor="ob-owned-since"
                hint="For calendar planning"
                className="sm:col-span-2"
              >
                <DateField
                  id="ob-owned-since"
                  value={form.ownedSince}
                  max={todayIsoDate()}
                  onChange={(ownedSince) => setForm({ ...form, ownedSince })}
                />
              </FormField>

              {catalogError ? (
                <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                  <p className="text-sm text-destructive">{catalogError}</p>
                  <Button type="button" variant="outline" size="sm" onClick={retryCatalogLoad}>
                    Retry
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="border-t border-border/70 pt-4">
              <DrivingStyleFields
                variant="onboarding"
                draft={driverDraft}
                milesInput={milesInput}
                onDraftChange={setDriverDraft}
                onMilesInputChange={setMilesInput}
              />
            </div>

            <RequestVehiclePanel
              apiBase={apiBase}
              source="onboarding"
              variant="primary"
              compact
              open={requestPanelOpen}
              onOpenChange={setRequestPanelOpen}
              defaultValues={{
                year: form.year || undefined,
                make: form.make || undefined,
                model: form.model || undefined,
                trim: form.trim || undefined,
              }}
            />
          </>
        ) : null}

        {step === "ready" && createdVehicle ? (
          <div className="space-y-3 rounded-lg border border-primary/25 bg-primary/5 px-4 py-4 text-sm">
            <p className="font-medium text-foreground">
              {createdVehicle.year} {createdVehicle.make} {createdVehicle.model} is ready.
            </p>
            {oemEntriesLoaded !== null ? (
              <p className="text-muted-foreground">
                Verified OEM schedule loaded ({oemEntriesLoaded} items).
              </p>
            ) : (
              <p className="text-muted-foreground">Home will use your OEM schedule to show what needs attention.</p>
            )}
            <p className="text-xs text-muted-foreground">
              Optional: Add records in the sidebar sharpens dates when you&apos;re ready.
            </p>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <FormActions>
          {showBack ? (
            <Button type="button" variant="outline" disabled={isBusy} onClick={goBack}>
              Back
            </Button>
          ) : null}
          {step === "setup" ? (
            <Button
              type="button"
              disabled={isBusy || isCatalogLoading || !setupComplete}
              onClick={() => void continueFromSetup()}
            >
              {isBusy ? "Saving…" : "Continue"}
            </Button>
          ) : null}
          {step === "ready" && createdVehicle ? (
            <Button type="button" disabled={isBusy} onClick={finishSetup}>
              {mode === "additional" ? "Done" : "Go to Home"}
            </Button>
          ) : null}
        </FormActions>
      </CardContent>
    </Card>
  );
}
