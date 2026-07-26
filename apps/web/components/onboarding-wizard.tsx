"use client";

import { useEffect, useMemo, useState } from "react";
import { DrivingStyleFields } from "@/components/driving-style-fields";
import { DateField } from "@/components/date-field";
import { FormActions, FormField } from "@/components/form-field";
import { RecordImportPanel } from "@/components/record-import-panel";
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
import { notify } from "@/lib/notify";
import {
  fetchVerifiedCatalogVehicles,
  formatCatalogVehicleLabel,
  type CatalogVehicleRow,
} from "@/lib/supported-vehicle-catalog";
import { cn } from "@/lib/utils";
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
};

const DOGFOOD_PACK_ID = "acura-tlx-2021-sh-awd";

const emptyVehicleForm = (): VehicleForm => ({
  packId: "",
  year: 0,
  make: "",
  model: "",
  trim: "",
  vin: "",
  currentMileage: 58_819,
  ownedSince: "",
});

const vehicleFormFromCatalog = (row: CatalogVehicleRow): VehicleForm => ({
  packId: row.packId,
  year: row.year,
  make: row.make,
  model: row.model,
  trim: row.trim,
  vin: "",
  currentMileage: row.packId === DOGFOOD_PACK_ID ? 58_819 : 0,
  ownedSince: "",
});

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
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (step !== "car" || catalog.length > 0) return;

    let cancelled = false;
    setIsCatalogLoading(true);
    setCatalogError("");

    void fetchVerifiedCatalogVehicles(apiBase)
      .then((rows) => {
        if (cancelled) return;
        setCatalog(rows);
        const defaultRow = rows.find((row) => row.packId === DOGFOOD_PACK_ID) ?? rows[0];
        if (defaultRow) {
          setForm((current) => (current.packId ? current : vehicleFormFromCatalog(defaultRow)));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalogError("Could not load the supported vehicle catalog. Refresh and try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiBase, catalog.length, step, catalogLoadAttempt]);

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
      ...vehicleFormFromCatalog(row),
      vin: current.vin,
      ownedSince: current.ownedSince,
      currentMileage:
        current.packId === row.packId && current.currentMileage > 0
          ? current.currentMileage
          : vehicleFormFromCatalog(row).currentMileage,
    }));
  };

  const createVehicle = async (): Promise<OnboardingVehicle | null> => {
    setIsBusy(true);
    setError("");

    const parsedMiles = parseStatedMilesPerYear(milesInput);
    if (parsedMiles === "invalid") {
      setError("Enter annual mileage between 1,000 and 80,000.");
      setIsBusy(false);
      return null;
    }

    if (!selectedVehicle) {
      setError("Pick a supported vehicle from the catalog.");
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

    if (form.currentMileage <= 0) {
      setError("Enter your current odometer reading.");
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
        error?: string;
        code?: string;
      };

      if (!response.ok) {
        if (body.code === "waitlist_required") {
          setError(
            body.error ??
              "This vehicle is not available in early access yet. Send a quick request below and we will email you.",
          );
          setRequestPanelOpen(true);
        } else {
          setError(body.error ?? "Could not create your vehicle.");
        }
        return null;
      }

      if (!body.vehicle) {
        setError("Could not create your vehicle.");
        return null;
      }

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
            ? "Three quick steps — pick your supported vehicle, driving profile, and import history — then your assistant workspace unlocks."
            : step === "car"
              ? "Select make, model, year, and trim — verified vehicles only. Check compatibility on vehicleos.app if you're unsure."
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
                ["01", "Pick your car"],
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
            <FormField
              label="Your vehicle"
              htmlFor="ob-vehicle-make"
              hint={`${catalog.length || "…"} verified configurations — pick make, model, year, and trim`}
              className="sm:col-span-2"
            >
              <VehicleYmmPicker
                vehicles={catalog}
                value={form.packId}
                disabled={isCatalogLoading || catalog.length === 0}
                onSelect={selectVehicle}
              />
            </FormField>

            {selectedVehicle ? (
              <div className="sm:col-span-2 space-y-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                <p>
                  Verified OEM maintenance schedule loads automatically for{" "}
                  <span className="font-medium">{formatCatalogVehicleLabel(selectedVehicle)}</span>.
                </p>
                {selectedVehicle.scheduleSourceLine ? (
                  <p className="text-muted-foreground">{selectedVehicle.scheduleSourceLine}</p>
                ) : null}
              </div>
            ) : null}

            <FormField label="Current mileage" htmlFor="ob-mileage">
              <Input
                id="ob-mileage"
                type="number"
                min={0}
                value={form.currentMileage || ""}
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
              className="sm:col-span-2"
            >
              <DateField
                id="ob-owned-since"
                value={form.ownedSince}
                max={todayIsoDate()}
                onChange={(ownedSince) => setForm({ ...form, ownedSince })}
              />
            </FormField>

            <RequestVehiclePanel
              apiBase={apiBase}
              source="onboarding"
              variant="fallback"
              open={requestPanelOpen}
              onOpenChange={setRequestPanelOpen}
              defaultValues={{
                year: form.year || undefined,
                make: form.make || undefined,
                model: form.model || undefined,
                trim: form.trim || undefined,
              }}
            />

            {catalogError ? (
              <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                <p className="text-sm text-destructive">{catalogError}</p>
                <Button type="button" variant="outline" size="sm" onClick={retryCatalogLoad}>
                  Retry
                </Button>
              </div>
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
                  !form.packId ||
                  isCatalogLoading ||
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
