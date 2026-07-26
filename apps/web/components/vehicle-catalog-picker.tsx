"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  filterCatalogVehicles,
  formatCatalogVehicleLabel,
  type CatalogVehicleRow,
} from "@/lib/supported-vehicle-catalog";
import { cn } from "@/lib/utils";

type VehicleCatalogPickerProps = {
  id?: string;
  vehicles: CatalogVehicleRow[];
  value: string;
  disabled?: boolean;
  onSelect: (packId: string) => void;
};

export function VehicleCatalogPicker({
  id = "vehicle-catalog-picker",
  vehicles,
  value,
  disabled = false,
  onSelect,
}: VehicleCatalogPickerProps) {
  const [query, setQuery] = useState("");
  const [makeFilter, setMakeFilter] = useState("");

  const makes = useMemo(
    () => Array.from(new Set(vehicles.map((row) => row.make))).sort((a, b) => a.localeCompare(b)),
    [vehicles],
  );

  const filtered = useMemo(
    () =>
      filterCatalogVehicles(vehicles, {
        q: query,
        make: makeFilter || undefined,
      }).slice(0, 80),
    [vehicles, query, makeFilter],
  );

  const selected = vehicles.find((row) => row.packId === value) ?? null;

  return (
    <div className="grid gap-2">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <Input
          id={id}
          type="search"
          placeholder="Search year, make, model, or trim…"
          value={query}
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={makeFilter}
          disabled={disabled}
          onChange={(event) => setMakeFilter(event.target.value)}
          aria-label="Filter by make"
        >
          <option value="">All makes</option>
          {makes.map((make) => (
            <option key={make} value={make}>
              {make}
            </option>
          ))}
        </select>
      </div>

      {selected ? (
        <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          Selected: <span className="font-medium">{formatCatalogVehicleLabel(selected)}</span>
        </p>
      ) : null}

      <div
        className={cn(
          "max-h-56 overflow-y-auto rounded-lg border border-border",
          disabled && "pointer-events-none opacity-60",
        )}
        role="listbox"
        aria-label="Supported vehicles"
      >
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">No matches — try another search.</p>
        ) : (
          filtered.map((row) => {
            const isSelected = row.packId === value;
            return (
              <button
                key={row.packId}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(
                  "flex w-full items-start px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60",
                  isSelected && "bg-primary/10 font-medium",
                )}
                onClick={() => onSelect(row.packId)}
              >
                {formatCatalogVehicleLabel(row)}
              </button>
            );
          })
        )}
      </div>

      {filtered.length === 80 ? (
        <p className="text-xs text-muted-foreground">Showing first 80 matches — refine your search.</p>
      ) : null}
    </div>
  );
}
