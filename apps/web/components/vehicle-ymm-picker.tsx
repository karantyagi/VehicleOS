"use client";

import { useEffect, useMemo, useState } from "react";
import { VehicleCatalogCombobox } from "@/components/vehicle-catalog-combobox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  findCatalogVehicleRow,
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
  selectedYear?: number;
  disabled?: boolean;
  onSelect: (row: CatalogVehicleRow | null) => void;
};

export function VehicleYmmPicker({
  vehicles,
  value,
  selectedYear,
  disabled = false,
  onSelect,
}: VehicleYmmPickerProps) {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [trimPackId, setTrimPackId] = useState("");

  useEffect(() => {
    if (!value) {
      setTrimPackId("");
      return;
    }

    const row = findCatalogVehicleRow(vehicles, {
      packId: value,
      year: selectedYear,
    });
    if (!row) return;
    setMake(row.make);
    setModel(row.model);
    setYear(row.year);
    setTrimPackId(row.packId);
  }, [value, selectedYear, vehicles]);

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

  const handleYearChange = (nextYear: string) => {
    setYear(Number(nextYear));
    clearSelection();
  };

  const handleTrimChange = (packId: string) => {
    setTrimPackId(packId);
    const row =
      trimRows.find((entry) => entry.packId === packId) ??
      findCatalogVehicleRow(vehicles, {
        packId,
        year: typeof year === "number" ? year : selectedYear,
      });
    onSelect(row ?? null);
  };

  return (
    <div className="space-y-4">
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Quick find</span>
        <VehicleCatalogCombobox
          vehicles={vehicles}
          disabled={disabled}
          selectedPackId={trimPackId}
          selectedYear={typeof year === "number" ? year : selectedYear}
          placeholder="e.g. 2021 Acura TLX or Honda Accord 2022"
          onSelect={applyRow}
        />
      </label>

      <p className="text-xs text-muted-foreground">Or browse:</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5 text-sm">
          <Label htmlFor="vehicle-make">Make</Label>
          <Select
            value={make || undefined}
            disabled={disabled || makes.length === 0}
            onValueChange={handleMakeChange}
          >
            <SelectTrigger id="vehicle-make" aria-label="Vehicle make">
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

        <div className="grid gap-1.5 text-sm">
          <Label htmlFor="vehicle-model">Model</Label>
          <Select
            value={model || undefined}
            disabled={disabled || !make || models.length === 0}
            onValueChange={handleModelChange}
          >
            <SelectTrigger id="vehicle-model" aria-label="Vehicle model">
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

        <div className="grid gap-1.5 text-sm">
          <Label htmlFor="vehicle-year">Year</Label>
          <Select
            value={typeof year === "number" ? String(year) : undefined}
            disabled={disabled || !model || years.length === 0}
            onValueChange={handleYearChange}
          >
            <SelectTrigger id="vehicle-year" aria-label="Vehicle year">
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

        <div className="grid gap-1.5 text-sm">
          <Label htmlFor="vehicle-trim">Trim</Label>
          <Select
            value={trimPackId || undefined}
            disabled={disabled || !year || trimRows.length === 0}
            onValueChange={handleTrimChange}
          >
            <SelectTrigger id="vehicle-trim" aria-label="Vehicle trim">
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
    </div>
  );
}
