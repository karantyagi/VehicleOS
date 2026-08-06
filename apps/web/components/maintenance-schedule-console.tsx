"use client";

import { useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { OwnerMaintenanceScheduleTimeline } from "@/components/owner-maintenance-schedule-timeline";
import { OwnerServiceScheduleBoardView } from "@/components/owner-service-schedule-board";
import type { MaintenanceRecordDraft } from "@/components/maintenance-record-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OwnerDueItemsView, QueueItem, ScheduleProjectionRow, TimelineEntry } from "@/lib/console-types";
import type { OwnerContextMemory } from "@vehicleos/domain";
import { cn } from "@/lib/utils";

type ScheduleHorizonView = "near" | "extended" | "full";

type MaintenanceScheduleConsoleProps = {
  nearRows: ScheduleProjectionRow[];
  extendedRows: ScheduleProjectionRow[];
  fullRows: ScheduleProjectionRow[];
  effectiveMilesPerYear: number;
  hasKnowledgeSchedule?: boolean;
  ownerSimple?: boolean;
  maintenancePatterns?: Record<string, { timing: "early" | "late"; reason: string; confirmedAt: string }>;
  observedMilesPerYear?: number | null;
  statedMilesPerYear?: number | null;
  dueSoonDays?: number;
  ownerDueItems?: OwnerDueItemsView | null;
  currentMileage?: number;
  disabled?: boolean;
  serviceTimeline?: TimelineEntry[];
  focusedEntryId?: string | null;
  ownerContextMemory?: OwnerContextMemory | null;
  onSaveOwnerContextMemory?: (
    memory: OwnerContextMemory,
    successMessage: string,
  ) => Promise<void>;
  onAddService?: (draft: MaintenanceRecordDraft) => Promise<void>;
  onUpdateService?: (serviceId: string, patch: Partial<TimelineEntry>) => Promise<void>;
  onUpdateCurrentMileage?: (mileage: number) => Promise<void>;
  attentionItems?: QueueItem[];
  onReviewAttentionTask?: (taskId: string) => void;
};

const emptyScheduleCopy = (hasKnowledgeSchedule: boolean) => {
  if (hasKnowledgeSchedule) {
    return {
      title: "Schedule projection warming up",
      description:
        "Verified OEM intervals are loaded. Import history or confirm a receipt so baselines anchor due dates — then rows appear here.",
    };
  }

  return {
    title: "No OEM schedule yet",
    description:
      "Supported vehicles load verified OEM intervals at setup automatically. Unsupported trims join the waitlist — you can still track history and attention from receipts.",
  };
};

const statusLabel: Record<ScheduleProjectionRow["status"], string> = {
  overdue: "Overdue",
  due_soon: "Due soon",
  upcoming: "Upcoming",
  needs_baseline: "Needs baseline",
};

const timingLabel: Record<NonNullable<ScheduleProjectionRow["oemTiming"]>, string> = {
  early: "Early",
  on_time: "On time",
  late: "Late",
  unknown: "Unknown",
};

const baselineLabel: Record<ScheduleProjectionRow["serviceBaseline"]["baselineSource"], string> = {
  receipt: "Receipt baseline",
  carfax: "CARFAX baseline",
  owned_since: "Owned-since baseline",
  unknown: "Needs baseline",
};

const statusVariant = (status: ScheduleProjectionRow["status"]) => {
  if (status === "overdue") return "warning" as const;
  if (status === "due_soon") return "oem" as const;
  if (status === "needs_baseline") return "outline" as const;
  return "secondary" as const;
};

const formatDueDate = (dueDate: string | null): string => {
  if (!dueDate) return "Set owned date or add receipt";
  return dueDate;
};

const horizonOptions: { id: ScheduleHorizonView; label: string; emptyHint: string }[] = [
  { id: "near", label: "3 months", emptyHint: "3" },
  { id: "extended", label: "12 months", emptyHint: "12" },
  { id: "full", label: "Full ownership", emptyHint: "ownership" },
];

export function MaintenanceScheduleConsole({
  nearRows,
  extendedRows,
  fullRows,
  effectiveMilesPerYear,
  hasKnowledgeSchedule = false,
  ownerSimple = false,
  maintenancePatterns,
  observedMilesPerYear,
  statedMilesPerYear,
  dueSoonDays,
  ownerDueItems = null,
  currentMileage = 0,
  disabled = false,
  serviceTimeline = [],
  focusedEntryId = null,
  ownerContextMemory,
  onSaveOwnerContextMemory,
  onAddService,
  onUpdateService,
  onUpdateCurrentMileage,
  attentionItems = [],
  onReviewAttentionTask,
}: MaintenanceScheduleConsoleProps) {
  const [horizon, setHorizon] = useState<ScheduleHorizonView>("near");

  const rowsByHorizon: Record<ScheduleHorizonView, ScheduleProjectionRow[]> = {
    near: nearRows,
    extended: extendedRows,
    full: fullRows,
  };

  const rows = rowsByHorizon[horizon];
  const activeHorizon = horizonOptions.find((option) => option.id === horizon) ?? horizonOptions[0];

  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleProjectionRow[]>();
    for (const row of rows) {
      const bucket = map.get(row.systemGroup) ?? [];
      bucket.push(row);
      map.set(row.systemGroup, bucket);
    }
    return [...map.entries()];
  }, [rows]);

  const horizonPicker = (
    <div
      className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5"
      role="group"
      aria-label="Schedule horizon"
    >
      {horizonOptions.map((option) => (
        <Button
          key={option.id}
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 rounded-md px-2.5 text-xs sm:px-3 sm:text-sm",
            horizon === option.id && "bg-background text-foreground shadow-sm",
          )}
          onClick={() => setHorizon(option.id)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );

  if (nearRows.length === 0 && extendedRows.length === 0 && fullRows.length === 0) {
    const emptyCopy = emptyScheduleCopy(hasKnowledgeSchedule);
    return (
      <EmptyState
        icon={CalendarClock}
        title={emptyCopy.title}
        description={emptyCopy.description}
      />
    );
  }

  if (ownerSimple && ownerDueItems) {
    return (
      <OwnerServiceScheduleBoardView
        dueItems={ownerDueItems}
        currentMileage={currentMileage}
        hasKnowledgeSchedule={hasKnowledgeSchedule}
        disabled={disabled}
        serviceTimeline={serviceTimeline}
        focusedEntryId={focusedEntryId}
        ownerContextMemory={ownerContextMemory}
        onSaveOwnerContextMemory={onSaveOwnerContextMemory}
        onAddService={onAddService}
        onUpdateService={onUpdateService}
        onUpdateCurrentMileage={onUpdateCurrentMileage}
        attentionItems={attentionItems}
        onReviewAttentionTask={onReviewAttentionTask}
      />
    );
  }

  if (ownerSimple) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Verified OEM intervals · calendar-first due dates
          </p>
          {horizonPicker}
        </div>
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Nothing due in the next {activeHorizon.emptyHint}
            {horizon === "full" ? " window" : " months"}. Expand horizon or import history to improve baselines.
          </p>
        ) : (
          <OwnerMaintenanceScheduleTimeline
            rows={rows}
            effectiveMilesPerYear={effectiveMilesPerYear}
            hasKnowledgeSchedule={hasKnowledgeSchedule}
            maintenancePatterns={maintenancePatterns}
            observedMilesPerYear={observedMilesPerYear}
            statedMilesPerYear={statedMilesPerYear}
            dueSoonDays={dueSoonDays}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Forward OEM intervals from verified packs · assumes{" "}
          <span className="font-medium text-foreground">{effectiveMilesPerYear.toLocaleString()} mi/year</span> for
          mileage-only rows
        </p>
        {horizonPicker}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Nothing due in the next {activeHorizon.emptyHint}
          {horizon === "full" ? " window" : " months"}. Expand horizon or import history to improve baselines.
        </p>
      ) : (
        grouped.map(([group, groupRows]) => (
          <div key={group} className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{group}</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead className="text-right">Mileage note</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupRows.map((row) => (
                  <TableRow key={row.entryId}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{row.serviceName}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {row.isStubSchedule ? (
                            <Badge variant="outline" className="text-[10px]">
                              Stub schedule
                            </Badge>
                          ) : null}
                          {row.dueDateConfidence === "mileage_converted" ? (
                            <Badge variant="outline" className="text-[10px]">
                              Mileage estimate
                            </Badge>
                          ) : null}
                          {row.serviceBaseline.baselineSource === "carfax" ? (
                            <Badge variant="outline" className="text-[10px]">
                              {baselineLabel.carfax}
                            </Badge>
                          ) : null}
                          {row.oemTiming && row.oemTiming !== "unknown" ? (
                            <Badge variant="outline" className="text-[10px]">
                              {timingLabel[row.oemTiming]}
                            </Badge>
                          ) : null}
                          {row.overdueWithoutHistory ? (
                            <Badge variant="outline" className="text-[10px]">
                              No history
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{formatDueDate(row.dueDate)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {row.dueMileage ? `${row.dueMileage.toLocaleString()} mi` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(row.status)} className={cn(row.status === "overdue" && "font-semibold")}>
                        {statusLabel[row.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))
      )}
    </div>
  );
}
