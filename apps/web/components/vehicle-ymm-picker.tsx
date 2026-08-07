"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  filterCatalogVehicles,
  catalogVehicleRowKey,
  findCatalogVehicleByPackId,
  formatCatalogTrimOptionLabel,
  formatCatalogVehicleLabel,
  listCatalogMakes,
  listCatalogModels,
  listCatalogTrimRows,
  listCatalogYears,
  type CatalogVehicleRow,
} from "@/lib/supported-vehicle-catalog";
import { cn } from "@/lib/utils";

type VehicleYmmPickerProps = {
  vehicles: CatalogVehicleRow[];
  value: string;
  valueYear?: number;
  /** VIN-decoded make/model/year; trim is deliberately never preselected. */
  guidedIdentity?: Pick<CatalogVehicleRow, "make" | "model" | "year"> | null;
  onGuidanceApplied?: (identity: Pick<CatalogVehicleRow, "make" | "model" | "year">) => void;
  disabled?: boolean;
  onSelect: (row: CatalogVehicleRow | null) => void;
};

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function VehicleYmmPicker({
  vehicles,
  value,
  valueYear,
  guidedIdentity = null,
  onGuidanceApplied,
  disabled = false,
  onSelect,
}: VehicleYmmPickerProps) {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [trimPackId, setTrimPackId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const appliedGuidance = useRef<string | null>(null);

  useEffect(() => {
    if (!value) {
      // Keep an in-progress cascade choice when the parent clears only the committed pack.
      // A zero/absent year means the whole form was reset externally.
      if (valueYear) return;
      setMake("");
      setModel("");
      setYear("");
      setTrimPackId("");
      return;
    }

    const row = findCatalogVehicleByPackId(vehicles, value, valueYear);
    if (!row) return;
    setMake(row.make);
    setModel(row.model);
    setYear(row.year);
    setTrimPackId(row.packId);
  }, [value, valueYear, vehicles]);

  useEffect(() => {
    if (!guidedIdentity) {
      appliedGuidance.current = null;
      return;
    }
    const guidanceKey = `${guidedIdentity.year}:${guidedIdentity.make}:${guidedIdentity.model}`;
    if (appliedGuidance.current === guidanceKey) return;

    appliedGuidance.current = guidanceKey;
    setMake(guidedIdentity.make);
    setModel(guidedIdentity.model);
    setYear(guidedIdentity.year);
    setTrimPackId("");
    // A VIN decoder can narrow a model, but the owner must choose the exact
    // verified trim/powertrain before VehicleOS attaches an OEM schedule.
    onSelect(null);
    onGuidanceApplied?.(guidedIdentity);
  }, [guidedIdentity, onGuidanceApplied, onSelect]);

  const makes = useMemo(() => listCatalogMakes(vehicles), [vehicles]);
  const models = useMemo(() => listCatalogModels(vehicles, make), [vehicles, make]);
  const years = useMemo(() => listCatalogYears(vehicles, make, model), [vehicles, make, model]);
  const trimRows = useMemo(
    () => (typeof year === "number" ? listCatalogTrimRows(vehicles, make, model, year) : []),
    [vehicles, make, model, year],
  );

  const quickMatches = useMemo(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return [];
    return filterCatalogVehicles(vehicles, { q }).slice(0, 6);
  }, [searchQuery, vehicles]);

  const clearSelection = () => {
    setTrimPackId("");
    onSelect(null);
  };

  const applyRow = (row: CatalogVehicleRow) => {
    setMake(row.make);
    setModel(row.model);
    setYear(row.year);
    setTrimPackId(row.packId);
    setSearchQuery("");
    onSelect(row);
  };

  const handleMakeChange = (nextMake: string) => {
    setMake(nextMake);
    setModel("");
    setYear("");
    clearSelection();
  };

  const handleModelChange = (nextModel: string) => {
    setModel(nextModel);
    setYear("");
    clearSelection();
  };

  const handleYearChange = (nextYear: number) => {
    setYear(nextYear);
    clearSelection();
  };

  const handleTrimChange = (packId: string) => {
    setTrimPackId(packId);
    const row = findCatalogVehicleByPackId(
      vehicles,
      packId,
      typeof year === "number" ? year : undefined,
    );
    onSelect(row);
  };

  return (
    <div className="space-y-4">
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Find a supported vehicle</span>
        <Input
          value={searchQuery}
          disabled={disabled}
          placeholder="e.g. Honda Accord 2022"
          aria-label="Search vehicles"
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </label>

      {quickMatches.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-border bg-muted/20 p-1">
          {quickMatches.map((row) => (
            <li key={catalogVehicleRowKey(row)}>
              <button
                type="button"
                disabled={disabled}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60",
                  trimPackId === row.packId && "bg-primary/10 font-medium text-primary",
                )}
                onClick={() => applyRow(row)}
              >
                {formatCatalogVehicleLabel(row)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-xs text-muted-foreground">Or browse verified OEM schedules:</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Make</span>
          <select
            className={selectClassName}
            value={make}
            disabled={disabled || makes.length === 0}
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

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Model</span>
          <select
            className={selectClassName}
            value={model}
            disabled={disabled || !make || models.length === 0}
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

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Year</span>
          <select
            className={selectClassName}
            value={year}
            disabled={disabled || !model || years.length === 0}
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

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Trim</span>
          <select
            className={selectClassName}
            value={trimPackId}
            disabled={disabled || !year || trimRows.length === 0}
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
    </div>
  );
}
