"use client";

import { Gauge, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useVehicleConsoleOptional } from "@/lib/vehicle-console-context";
import { useAppUiStore } from "@/lib/store/app-ui-store";
import { cn } from "@/lib/utils";

export function VehicleContextBar() {
  const ctx = useVehicleConsoleOptional();
  const density = useAppUiStore((s) => s.density);
  const toggleDensity = useAppUiStore((s) => s.toggleDensity);

  if (!ctx?.snapshot) return null;

  const { snapshot } = ctx;

  return (
    <div
      className={cn(
        "console-motion-fade sticky top-0 z-10 -mx-4 mb-6 border-b border-border/80 bg-background/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
        <p className="min-w-0 truncate font-medium text-foreground">{snapshot.label}</p>
        <span className="tabular-nums text-muted-foreground">{snapshot.mileage.toLocaleString()} mi</span>
        {snapshot.lastServiceDate ? (
          <span className="hidden text-muted-foreground sm:inline">
            Last service · {snapshot.lastServiceDate}
            {snapshot.lastServiceShop ? ` · ${snapshot.lastServiceShop}` : ""}
          </span>
        ) : (
          <span className="hidden text-muted-foreground sm:inline">No service recorded yet</span>
        )}
        <Badge variant={snapshot.pendingNowCount > 0 ? "default" : "secondary"} className="tabular-nums gap-1">
          <ListChecks className="h-3 w-3" aria-hidden />
          {snapshot.pendingNowCount} pending
        </Badge>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs",
            snapshot.pipelinePhase === "idle"
              ? "border-border text-muted-foreground"
              : "border-primary/30 bg-primary/5 text-primary",
          )}
          title={snapshot.pipelineLabel}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              snapshot.pipelinePhase === "idle" ? "bg-muted-foreground/50" : "animate-pulse bg-primary",
            )}
            aria-hidden
          />
          {snapshot.pipelineLabel}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-xs"
            onClick={toggleDensity}
            aria-label={density === "comfortable" ? "Switch to compact density" : "Switch to comfortable density"}
          >
            <Gauge className="h-3.5 w-3.5" aria-hidden />
            {density === "comfortable" ? "Comfortable" : "Compact"}
          </Button>
        </div>
      </div>
    </div>
  );
}
