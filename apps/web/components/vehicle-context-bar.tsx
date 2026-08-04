"use client";

import { CircleAlert, ListChecks } from "lucide-react";
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
  const setActiveSection = useAppUiStore((s) => s.setActiveSection);

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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-full bg-primary/10 px-2.5 text-primary hover:bg-primary/15 hover:text-primary"
              aria-label={`Open ${snapshot.pendingReminderCount} item${snapshot.pendingReminderCount === 1 ? "" : "s"} needing attention`}
              onClick={() => setActiveSection("reminders")}
            >
              <CircleAlert className="h-3 w-3" aria-hidden />
              {snapshot.pendingReminderCount} {snapshot.pendingReminderCount === 1 ? "needs" : "need"} attention
            </Button>
          ) : null}
          {!isDeveloper && snapshot && snapshot.pendingVerificationCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-full border border-amber-200 bg-amber-50 px-2.5 text-amber-900 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60 dark:hover:text-amber-100"
              aria-label={`Open ${snapshot.pendingVerificationCount} item${snapshot.pendingVerificationCount === 1 ? "" : "s"} to verify`}
              onClick={() => setActiveSection("now")}
            >
              <ListChecks className="h-3 w-3" aria-hidden />
              {snapshot.pendingVerificationCount} to verify
            </Button>
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
              <CircleAlert className="h-3 w-3" aria-hidden />
              {snapshot.pendingReminderCount} attention item{snapshot.pendingReminderCount === 1 ? "" : "s"}
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
