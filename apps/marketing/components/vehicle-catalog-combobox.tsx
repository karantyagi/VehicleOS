"use client";

import { useMemo, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { searchCatalogVehicles } from "@/lib/catalog-vehicle-search";
import {
  catalogVehicleRowKey,
  formatCatalogVehicleLabel,
  isSameCatalogVehicleRow,
  type CatalogVehicleRow,
} from "@/lib/catalog-cascade";
import { cn } from "@/lib/utils";

type VehicleCatalogComboboxProps = {
  vehicles: CatalogVehicleRow[];
  disabled?: boolean;
  selectedPackId?: string;
  selectedYear?: number;
  placeholder?: string;
  onSelect: (row: CatalogVehicleRow) => void;
};

export function VehicleCatalogCombobox({
  vehicles,
  disabled = false,
  selectedPackId,
  selectedYear,
  placeholder = "Search year, make, model, trim…",
  onSelect,
}: VehicleCatalogComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(
    () => searchCatalogVehicles(vehicles, query, { limit: 20 }),
    [query, vehicles],
  );

  const selectedRow = useMemo(() => {
    if (!selectedPackId || selectedYear == null || selectedYear <= 0) return null;
    return { packId: selectedPackId, year: selectedYear };
  }, [selectedPackId, selectedYear]);

  const showResults = open && query.trim().length >= 2;

  return (
    <Popover open={showResults} onOpenChange={setOpen}>
      <Command shouldFilter={false} loop className="overflow-visible bg-transparent">
        <PopoverAnchor asChild>
          <div className="w-full">
            <CommandInput
              value={query}
              disabled={disabled}
              placeholder={placeholder}
              aria-label="Search vehicles"
              aria-expanded={showResults}
              aria-controls="marketing-vehicle-catalog-search-list"
              wrapperClassName="border border-input rounded-md bg-card px-3 shadow-sm"
              className="h-9 py-1"
              onFocus={() => setOpen(true)}
              onValueChange={(value) => {
                setQuery(value);
                setOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setOpen(false);
                }
              }}
            />
          </div>
        </PopoverAnchor>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={() => setOpen(false)}
        >
          <CommandList id="marketing-vehicle-catalog-search-list" className="max-h-72">
            {results.length === 0 ? (
              <CommandEmpty>No matches — try year + make + model (e.g. 2021 Acura TLX)</CommandEmpty>
            ) : (
              <CommandGroup heading="Supported vehicles">
                {results.map((row) => (
                  <CommandItem
                    key={catalogVehicleRowKey(row)}
                    value={catalogVehicleRowKey(row)}
                    className={cn(
                      selectedRow &&
                        isSameCatalogVehicleRow(selectedRow, row) &&
                        "bg-primary/10 font-medium text-primary",
                    )}
                    onSelect={() => {
                      onSelect(row);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    {formatCatalogVehicleLabel(row)}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </PopoverContent>
      </Command>
    </Popover>
  );
}
