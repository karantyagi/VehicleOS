"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, ChevronRight, ChevronUp } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ScheduleProjectionRow } from "@/lib/console-types";
import { isoDateToLocalDate } from "@/lib/date-input";
import { cn } from "@/lib/utils";

type OwnerMaintenanceScheduleTimelineProps = {
  rows: ScheduleProjectionRow[];
  effectiveMilesPerYear: number;
  hasKnowledgeSchedule?: boolean;
  today?: string;
};

const statusLabel: Record<ScheduleProjectionRow["status"], string> = {
  overdue: "Overdue",
  due_soon: "Due soon",
  upcoming: "Upcoming",
  needs_baseline: "Needs baseline",
};

const timingLabel: Record<NonNullable<ScheduleProjectionRow["oemTiming"]>, string> = {
  early: "Early vs OEM",
  on_time: "On time vs OEM",
  late: "Late vs OEM",
  unknown: "Timing unknown",
};

const formatDueDate = (dueDate: string | null): string => {
  if (!dueDate) return "Set owned date or add history";
  const date = isoDateToLocalDate(dueDate);
  if (!date) return dueDate;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const monthKey = (dueDate: string | null): string => {
  if (!dueDate) return "needs-baseline";
  return dueDate.slice(0, 7);
};

const monthLabel = (key: string): string => {
  if (key === "needs-baseline") return "Needs baseline";
  const date = isoDateToLocalDate(`${key}-01`);
  if (!date) return key;
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

const statusRailClass = (status: ScheduleProjectionRow["status"]) => {
  if (status === "overdue") return "border-destructive/40 bg-destructive/5";
  if (status === "due_soon") return "border-primary/35 bg-primary/5";
  if (status === "needs_baseline") return "border-border/80 bg-muted/20";
  return "border-border/70 bg-card/90";
};

const statusDotClass = (status: ScheduleProjectionRow["status"]) => {
  if (status === "overdue") return "bg-destructive shadow-[0_0_0_3px_hsl(var(--destructive)/0.18)]";
  if (status === "due_soon") return "bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.18)]";
  return "bg-muted-foreground/50 shadow-[0_0_0_3px_hsl(var(--muted-foreground)/0.12)]";
};

const groupRowsByMonth = (rows: ScheduleProjectionRow[]): [string, ScheduleProjectionRow[]][] => {
  const map = new Map<string, ScheduleProjectionRow[]>();
  for (const row of rows) {
    const key = monthKey(row.dueDate);
    const bucket = map.get(key) ?? [];
    bucket.push(row);
    map.set(key, bucket);
  }

  return [...map.entries()].sort(([left], [right]) => {
    if (left === "needs-baseline") return 1;
    if (right === "needs-baseline") return -1;
    return left.localeCompare(right);
  });
};

export function OwnerMaintenanceScheduleTimeline({
  rows,
  effectiveMilesPerYear,
  hasKnowledgeSchedule = false,
  today,
}: OwnerMaintenanceScheduleTimelineProps) {
  const todayIso = today ?? new Date().toISOString().slice(0, 10);
  const monthGroups = useMemo(() => groupRowsByMonth(rows), [rows]);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (monthGroups.length === 0) return;
    setExpandedMonths((current) => {
      if (current.size > 0) return current;
      const first = monthGroups.find(([key]) => key !== "needs-baseline")?.[0] ?? monthGroups[0][0];
      return new Set([first]);
    });
  }, [monthGroups]);

  const toggleMonth = (key: string) => {
    setExpandedMonths((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title={hasKnowledgeSchedule ? "Schedule projection warming up" : "No OEM schedule yet"}
        description={
          hasKnowledgeSchedule
            ? "Verified OEM intervals are loaded. Import history or add a record so baselines anchor due dates."
            : "Supported vehicles load verified OEM intervals at setup automatically."
        }
      />
    );
  }

  const dueSoonCount = rows.filter((row) => row.status === "due_soon" || row.status === "overdue").length;
  const nextRow = rows.find((row) => row.dueDate && row.status !== "needs_baseline");

  return (
    <div className="space-y-6">
      <div className="history-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Forward schedule</p>
            <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
              {nextRow ? formatDueDate(nextRow.dueDate) : "Baselines needed"}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {nextRow ? `Next up: ${nextRow.serviceName}` : "Add owned date or import history to anchor dates"}
            </p>
          </div>
          <dl className="flex shrink-0 gap-5 text-sm tabular-nums">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Due soon</dt>
              <dd className="mt-0.5 font-semibold text-foreground">{dueSoonCount}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Mi/year</dt>
              <dd className="mt-0.5 font-semibold text-foreground">{effectiveMilesPerYear.toLocaleString()}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="relative space-y-6">
        <div className="pointer-events-none absolute bottom-0 left-[0.4375rem] top-2 w-px bg-gradient-to-b from-primary/35 via-primary/12 to-transparent" />

        <div className="relative pl-6">
          <span className="absolute left-0 top-0 inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Today · {formatDueDate(todayIso)}
          </span>
        </div>

        {monthGroups.map(([key, monthRows]) => {
          const isOpen = expandedMonths.has(key);
          return (
            <section key={key} className="relative">
              <button
                type="button"
                className="group flex w-full items-center gap-2 rounded-lg py-1 pl-6 pr-2 text-left history-interactive"
                aria-expanded={isOpen}
                onClick={() => toggleMonth(key)}
              >
                <span
                  className={cn(
                    "absolute left-0 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-background transition-shadow",
                    statusDotClass(monthRows[0]?.status ?? "upcoming"),
                  )}
                  aria-hidden
                />
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
                )}
                <span className="text-base font-semibold tracking-tight text-foreground">{monthLabel(key)}</span>
                <span className="text-sm tabular-nums text-muted-foreground group-hover:text-primary/85">
                  {monthRows.length} item{monthRows.length === 1 ? "" : "s"}
                </span>
              </button>

              {isOpen ? (
                <ul className="history-accent-rail mt-2 space-y-2.5">
                  {monthRows.map((row) => (
                    <li
                      key={row.entryId}
                      className={cn(
                        "overflow-hidden rounded-xl border p-3.5 sm:p-4 shadow-sm",
                        statusRailClass(row.status),
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            {row.systemGroup}
                          </p>
                          <p className="mt-1 text-base font-semibold tracking-tight text-foreground">{row.serviceName}</p>
                          <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                            Due {formatDueDate(row.dueDate)}
                            {row.dueMileage ? ` · ${row.dueMileage.toLocaleString()} mi` : ""}
                          </p>
                          {row.serviceBaseline.performedDate ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Last: {formatDueDate(row.serviceBaseline.performedDate)}
                              {row.serviceBaseline.performedMileage
                                ? ` · ${row.serviceBaseline.performedMileage.toLocaleString()} mi`
                                : ""}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Badge
                            variant={row.status === "overdue" ? "warning" : row.status === "due_soon" ? "oem" : "secondary"}
                          >
                            {statusLabel[row.status]}
                          </Badge>
                          {row.oemTiming && row.oemTiming !== "unknown" ? (
                            <Badge variant="outline" className="text-[10px]">
                              {timingLabel[row.oemTiming]}
                            </Badge>
                          ) : null}
                          {row.overdueWithoutHistory ? (
                            <Badge variant="outline" className="text-[10px]">
                              No history match
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
