"use client";

import { useEffect, useMemo, useState } from "react";
import { VehicleCatalogCombobox } from "@/components/vehicle-catalog-combobox";
import {
  findCatalogVehicleByPackId,
  formatCatalogTrimOptionLabel,
  listCatalogMakes,
  listCatalogModels,
  listCatalogTrimRows,
  listCatalogYears,
  type CatalogVehicleRow,
} from "@/lib/supported-vehicle-catalog";

type VehicleYmmPickerProps = {
  vehicles: CatalogVehicleRow[];
  value: string;
  disabled?: boolean;
  onSelect: (row: CatalogVehicleRow | null) => void;
};

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function VehicleYmmPicker({
  vehicles,
  value,
  disabled = false,
  onSelect,
}: VehicleYmmPickerProps) {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [trimPackId, setTrimPackId] = useState("");

  useEffect(() => {
    if (!value) {
      setMake("");
      setModel("");
      setYear("");
      setTrimPackId("");
      return;
    }

    const row = findCatalogVehicleByPackId(vehicles, value);
    if (!row) return;
    setMake(row.make);
    setModel(row.model);
    setYear(row.year);
    setTrimPackId(row.packId);
  }, [value, vehicles]);

  const makes = useMemo(() => listCatalogMakes(vehicles), [vehicles]);
  const models = useMemo(() => listCatalogModels(vehicles, make), [vehicles, make]);
  const years = useMemo(() => listCatalogYears(vehicles, make, model), [vehicles, make, model]);
  const trimRows = useMemo(
    () => (typeof year === "number" ? listCatalogTrimRows(vehicles, make, model, year) : []),
    [vehicles, make, model, year],
  );

  const clearSelection = () => {
    setTrimPackId("");
    onSelect(null);
  };

  const applyRow = (row: CatalogVehicleRow) => {
    setMake(row.make);
    setModel(row.model);
    setYear(row.year);
    setTrimPackId(row.packId);
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
    const row = findCatalogVehicleByPackId(vehicles, packId);
    onSelect(row);
  };

  return (
    <div className="space-y-4">
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Quick find</span>
        <VehicleCatalogCombobox
          vehicles={vehicles}
          disabled={disabled}
          selectedPackId={trimPackId}
          placeholder="e.g. 2021 Acura TLX or Honda Accord 2022"
          onSelect={applyRow}
        />
      </label>

      <p className="text-xs text-muted-foreground">Or browse:</p>

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
