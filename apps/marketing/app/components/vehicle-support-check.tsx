"use client";

import { useEffect, useMemo, useState } from "react";
import { VehicleCatalogCombobox } from "@/components/vehicle-catalog-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchCatalogVehicles,
  findCatalogVehicleRow,
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

type VehicleDraft = {
  year: number;
  make: string;
  model: string;
  trim: string;
};

type RequestSuccess = {
  email: string;
  vehicle: VehicleDraft;
};

const emptyManualDraft = (): VehicleDraft => ({
  year: new Date().getFullYear(),
  make: "",
  model: "",
  trim: "",
});

const fieldControlClassName = "vos-field-control h-10 bg-card text-foreground";

export function VehicleSupportCheck() {
  const [catalog, setCatalog] = useState<CatalogVehicleRow[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [mode, setMode] = useState<"pick" | "request">("pick");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [selectedPackId, setSelectedPackId] = useState("");
  const [manualDraft, setManualDraft] = useState<VehicleDraft>(emptyManualDraft);
  const [status, setStatus] = useState<VehicleSupportResponse | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<RequestSuccess | null>(null);

  const selectedRow = useMemo(
    () =>
      findCatalogVehicleRow(catalog, {
        packId: selectedPackId,
        year: typeof year === "number" ? year : undefined,
      }),
    [catalog, selectedPackId, year],
  );

  const makes = useMemo(() => listCatalogMakes(catalog), [catalog]);
  const models = useMemo(() => listCatalogModels(catalog, make), [catalog, make]);
  const years = useMemo(() => listCatalogYears(catalog, make, model), [catalog, make, model]);
  const trimRows = useMemo(
    () => (typeof year === "number" ? listCatalogTrimRows(catalog, make, model, year) : []),
    [catalog, make, model, year],
  );

  const manualComplete =
    manualDraft.make.trim().length > 0 &&
    manualDraft.model.trim().length > 0 &&
    manualDraft.trim.trim().length > 0 &&
    Number.isFinite(manualDraft.year);

  useEffect(() => {
    void fetchCatalogVehicles()
      .then((rows) => {
        setCatalog(rows);
        setCatalogError("");
      })
      .catch(() => {
        setCatalogError("Could not load the car list. Refresh and try again.");
      });
  }, []);

  useEffect(() => {
    if (mode !== "pick" || !selectedRow) {
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
        if (!cancelled) setStatus(body);
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
  }, [mode, selectedRow]);

  const resetRequestState = () => {
    setRequestSuccess(null);
    setRequestError("");
    setContactEmail("");
  };

  const openRequestMode = () => {
    setMode("request");
    setStatus(null);
    resetRequestState();
    setManualDraft({
      year: typeof year === "number" ? year : new Date().getFullYear(),
      make,
      model,
      trim: "",
    });
  };

  const openPickMode = () => {
    setMode("pick");
    resetRequestState();
  };

  const applyCatalogRow = (row: CatalogVehicleRow) => {
    setMake(row.make);
    setModel(row.model);
    setYear(row.year);
    setSelectedPackId(row.packId);
  };

  const submitRequest = async (vehicle: VehicleDraft) => {
    setRequestError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/catalog/vehicle-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: vehicle.year,
          make: vehicle.make.trim(),
          model: vehicle.model.trim(),
          trim: vehicle.trim.trim(),
          contactEmail: contactEmail.trim(),
          source: "marketing",
        }),
      });

      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        setRequestError(body.error ?? "Something went wrong. Try again.");
        return;
      }

      setRequestSuccess({
        email: contactEmail.trim(),
        vehicle: {
          year: vehicle.year,
          make: vehicle.make.trim(),
          model: vehicle.model.trim(),
          trim: vehicle.trim.trim(),
        },
      });
    } catch {
      setRequestError("Something went wrong. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestEmailForm = (vehicle: VehicleDraft, submitLabel: string) => (
    <div className="support-request support-request-inline">
      <label className="support-field support-field-full">
        <span>Your email</span>
        <Input
          type="email"
          autoComplete="email"
          placeholder="you@email.com"
          value={contactEmail}
          className={fieldControlClassName}
          onChange={(event) => setContactEmail(event.target.value)}
        />
      </label>
      {requestError ? <p className="support-request-error">{requestError}</p> : null}
      <button
        type="button"
        className="btn btn-primary support-request-submit"
        disabled={isSubmitting || !contactEmail.trim()}
        onClick={() => void submitRequest(vehicle)}
      >
        {isSubmitting ? "Sending…" : submitLabel}
      </button>
    </div>
  );

  if (requestSuccess) {
    const { vehicle } = requestSuccess;
    return (
      <div className="support-check" id="supported">
        <div className="support-request support-request-success" role="status">
          <strong>Got it — we&apos;re prioritizing your car.</strong>
          <p>
            We&apos;ll email you when your car is ready.
          </p>
          <button type="button" className="btn btn-secondary support-request-back" onClick={() => {
            setRequestSuccess(null);
            setMode("pick");
            setMake("");
            setModel("");
            setYear("");
            setSelectedPackId("");
            setManualDraft(emptyManualDraft());
          }}>
            Check another car
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="support-check" id="supported">
      <div className="support-check-header">
        <div>
          <p className="support-check-eyebrow">Find your car</p>
          <h3 className="support-check-title">Is your car supported today?</h3>
        </div>
      </div>

      {catalogError ? <p className="support-check-error">{catalogError}</p> : null}

      {mode === "pick" ? (
        <>
          <div className="support-check-form">
            <div className="support-field support-field-full">
              <span>Quick find</span>
              <VehicleCatalogCombobox
                vehicles={catalog}
                selectedPackId={selectedPackId}
                selectedYear={typeof year === "number" ? year : undefined}
                placeholder="e.g. 2021 Acura TLX or Honda Accord 2022"
                onSelect={applyCatalogRow}
              />
            </div>

            <div className="support-field">
              <Label htmlFor="marketing-vehicle-make" className="text-inherit">
                Make
              </Label>
              <Select
                value={make || undefined}
                disabled={makes.length === 0}
                onValueChange={(value) => {
                  setMake(value);
                  setModel("");
                  setYear("");
                  setSelectedPackId("");
                }}
              >
                <SelectTrigger id="marketing-vehicle-make" className={fieldControlClassName} aria-label="Vehicle make">
                  <SelectValue placeholder="Select make" />
                </SelectTrigger>
                <SelectContent>
                  {makes.map((entry) => (
                    <SelectItem key={entry} value={entry}>
                      {entry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="support-field">
              <Label htmlFor="marketing-vehicle-model" className="text-inherit">
                Model
              </Label>
              <Select
                value={model || undefined}
                disabled={!make || models.length === 0}
                onValueChange={(value) => {
                  setModel(value);
                  setYear("");
                  setSelectedPackId("");
                }}
              >
                <SelectTrigger id="marketing-vehicle-model" className={fieldControlClassName} aria-label="Vehicle model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((entry) => (
                    <SelectItem key={entry} value={entry}>
                      {entry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="support-field">
              <Label htmlFor="marketing-vehicle-year" className="text-inherit">
                Year
              </Label>
              <Select
                value={typeof year === "number" ? String(year) : undefined}
                disabled={!model || years.length === 0}
                onValueChange={(value) => {
                  setYear(Number(value));
                  setSelectedPackId("");
                }}
              >
                <SelectTrigger id="marketing-vehicle-year" className={fieldControlClassName} aria-label="Vehicle year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((entry) => (
                    <SelectItem key={entry} value={String(entry)}>
                      {entry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="support-field">
              <Label htmlFor="marketing-vehicle-trim" className="text-inherit">
                Trim
              </Label>
              <Select
                value={selectedPackId || undefined}
                disabled={!year || trimRows.length === 0}
                onValueChange={setSelectedPackId}
              >
                <SelectTrigger id="marketing-vehicle-trim" className={fieldControlClassName} aria-label="Vehicle trim">
                  <SelectValue placeholder="Select trim" />
                </SelectTrigger>
                <SelectContent>
                  {trimRows.map((row) => (
                    <SelectItem key={row.packId} value={row.packId}>
                      {formatCatalogTrimOptionLabel(row)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="support-check-alt">
            Don&apos;t see your car?{" "}
            <button type="button" className="support-check-alt-link" onClick={openRequestMode}>
              Tell us what you drive
            </button>
          </p>

          <div
            className={`support-result ${status?.supported ? "support-result-yes" : status && !status.supported ? "support-result-waitlist" : "support-result-neutral"}`}
            aria-live="polite"
          >
            {isChecking && !status ? (
              <p>Checking…</p>
            ) : status?.supported && selectedRow ? (
              <>
                <strong>Yes — you&apos;re good to go</strong>
                <p>Sign in and set up your car. Your maintenance schedule is ready.</p>
                <div className="support-result-actions">
                  <a className="btn btn-primary support-result-cta" href={siteConfig.appUrl} target="_blank" rel="noopener noreferrer">
                    Get early access
                  </a>
                </div>
              </>
            ) : status && !status.supported && selectedRow ? (
              <>
                <strong>Not yet — but we can add it</strong>
                <p>Leave your email and we&apos;ll let you know when this car is ready to set up.</p>
                {requestEmailForm(selectedRow, "Notify me")}
              </>
            ) : (
              <p>Pick your make, model, year, and trim to check.</p>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="support-request-intro">Tell us what you drive. We&apos;ll email you when it&apos;s ready.</p>

          <div className="support-check-form">
            <label className="support-field">
              <span>Year</span>
              <Input
                type="number"
                min={1980}
                max={new Date().getFullYear() + 1}
                value={manualDraft.year}
                className={fieldControlClassName}
                onChange={(event) =>
                  setManualDraft({ ...manualDraft, year: Number(event.target.value) })
                }
              />
            </label>
            <label className="support-field">
              <span>Make</span>
              <Input
                value={manualDraft.make}
                placeholder="Hyundai"
                className={fieldControlClassName}
                onChange={(event) => setManualDraft({ ...manualDraft, make: event.target.value })}
              />
            </label>
            <label className="support-field">
              <span>Model</span>
              <Input
                value={manualDraft.model}
                placeholder="Elantra"
                className={fieldControlClassName}
                onChange={(event) => setManualDraft({ ...manualDraft, model: event.target.value })}
              />
            </label>
            <label className="support-field">
              <span>Trim</span>
              <Input
                value={manualDraft.trim}
                placeholder="Limited"
                className={fieldControlClassName}
                onChange={(event) => setManualDraft({ ...manualDraft, trim: event.target.value })}
              />
            </label>
          </div>

          {manualComplete ? requestEmailForm(manualDraft, "Request my car") : null}

          <p className="support-check-alt">
            <button type="button" className="support-check-alt-link" onClick={openPickMode}>
              Back to the list
            </button>
          </p>
        </>
      )}
    </div>
  );
}
