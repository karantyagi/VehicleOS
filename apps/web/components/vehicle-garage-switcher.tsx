"use client";

import { Car, ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatGarageVehicleLabel } from "@/lib/garage/types";
import { useGarageOptional } from "@/lib/garage/garage-context";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

type VehicleGarageSwitcherProps = {
  compact?: boolean;
  className?: string;
};

export function VehicleGarageSwitcher({ compact = false, className }: VehicleGarageSwitcherProps) {
  const garage = useGarageOptional();
  const [open, setOpen] = useState(false);

  if (!garage || garage.isLoading || garage.vehicles.length === 0) return null;

  const active = garage.activeVehicle;
  const label = active ? formatGarageVehicleLabel(active) : "Select vehicle";

  const handleSelect = (vehicleId: string) => {
    if (vehicleId === garage.activeVehicleId) {
      setOpen(false);
      return;
    }
    const result = garage.switchVehicle(vehicleId);
    if (!result.ok) {
      notify(result.reason, "error");
      return;
    }
    setOpen(false);
  };

  const handleAdd = () => {
    const result = garage.startAddVehicle();
    if (!result.ok) {
      notify(result.reason, "error");
      return;
    }
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={compact ? "sm" : "default"}
          className={cn("max-w-full justify-between gap-2", className)}
          disabled={garage.switchLock.locked}
          title={garage.switchLock.locked ? garage.switchLock.reason ?? undefined : undefined}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <Car className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-2">
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your vehicles</p>
        <div className="space-y-0.5">
          {garage.vehicles.map((vehicle) => (
            <button
              key={vehicle.id}
              type="button"
              className={cn(
                "flex w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/80",
                vehicle.id === garage.activeVehicleId && "bg-accent",
              )}
              onClick={() => handleSelect(vehicle.id)}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{formatGarageVehicleLabel(vehicle)}</span>
                <span className="block text-xs tabular-nums text-muted-foreground">
                  {vehicle.currentMileage.toLocaleString()} mi
                </span>
              </span>
            </button>
          ))}
        </div>
        <div className="my-2 h-px bg-border/80" />
        {garage.garage?.canAddVehicle ? (
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/80"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add vehicle
          </button>
        ) : (
          <p className="px-2 text-xs leading-relaxed text-muted-foreground">
            {garage.garage?.upgradeMessage ?? "Vehicle limit reached"}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
