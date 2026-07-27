"use client";

import { BellRing, ListChecks } from "lucide-react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VehicleGarageSwitcher } from "@/components/vehicle-garage-switcher";
import { useGarageOptional } from "@/lib/garage/garage-context";
import { useVehicleConsoleOptional } from "@/lib/vehicle-console-context";
import { useAppUiStore } from "@/lib/store/app-ui-store";
import { cn } from "@/lib/utils";

export function VehicleContextBar() {
  const ctx = useVehicleConsoleOptional();
  const garage = useGarageOptional();
  const consoleMode = useAppUiStore((s) => s.consoleMode);
  const density = useAppUiStore((s) => s.density);
  const toggleDensity = useAppUiStore((s) => s.toggleDensity);

  if (!garage || garage.isLoading) return null;

  const showSwitcher = garage.vehicles.length > 0;
  const isDeveloper = consoleMode === "developer";
  const snapshot = ctx?.snapshot;

  if (!showSwitcher && !snapshot) return null;

  return (
    <div className="console-motion-fade -mx-4 mb-4 space-y-3 px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
      {garage.switchLock.locked && garage.switchLock.reason ? (
        <Alert variant="info" className="text-sm">
          {garage.switchLock.reason}
        </Alert>
      ) : null}

      <div
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
          isDeveloper &&
            "sticky top-0 z-10 border-b border-border/80 bg-background/95 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/85",
        )}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {showSwitcher ? <VehicleGarageSwitcher compact className="min-w-[12rem] max-w-full" /> : null}
          {!isDeveloper && snapshot && snapshot.pendingReminderCount > 0 ? (
            <Badge variant="default" className="gap-1 tabular-nums">
              <BellRing className="h-3 w-3" aria-hidden />
              {snapshot.pendingReminderCount} due
            </Badge>
          ) : null}
          {!isDeveloper && snapshot && snapshot.pendingVerificationCount > 0 ? (
            <Badge variant="warning" className="gap-1 tabular-nums">
              <ListChecks className="h-3 w-3" aria-hidden />
              {snapshot.pendingVerificationCount} to verify
            </Badge>
          ) : null}
        </div>

        {isDeveloper && snapshot ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
            <Link
              href="/garage?tab=car"
              className="min-w-0 truncate font-medium text-foreground underline-offset-4 hover:underline"
            >
              {snapshot.label}
            </Link>
            <span className="tabular-nums text-muted-foreground">{snapshot.mileage.toLocaleString()} mi</span>
            <Badge variant={snapshot.pendingReminderCount > 0 ? "default" : "secondary"} className="gap-1 tabular-nums">
              <BellRing className="h-3 w-3" aria-hidden />
              {snapshot.pendingReminderCount} reminder{snapshot.pendingReminderCount === 1 ? "" : "s"}
            </Badge>
            {snapshot.pendingVerificationCount > 0 ? (
              <Badge variant="warning" className="gap-1 tabular-nums">
                <ListChecks className="h-3 w-3" aria-hidden />
                {snapshot.pendingVerificationCount} to verify
              </Badge>
            ) : null}
            <Button type="button" variant="outline" size="sm" className="ml-auto h-8 px-2.5 text-xs" onClick={toggleDensity}>
              {density === "comfortable" ? "Comfortable" : "Compact"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
