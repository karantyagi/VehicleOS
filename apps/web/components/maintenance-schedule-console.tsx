"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, ChevronDown } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ScheduleProjectionRow } from "@/lib/console-types";
import { cn } from "@/lib/utils";

type MaintenanceScheduleConsoleProps = {
  nearRows: ScheduleProjectionRow[];
  extendedRows: ScheduleProjectionRow[];
  effectiveMilesPerYear: number;
};

const SYSTEM_GROUP_ORDER = ["Engine", "Brakes", "Fluids", "Filters", "Tires", "Other"] as const;

const statusLabel: Record<ScheduleProjectionRow["status"], string> = {
  overdue: "Overdue",
  due_soon: "Due soon",
  upcoming: "Upcoming",
  needs_baseline: "Needs baseline",
};

const statusRank: Record<ScheduleProjectionRow["status"], number> = {
  overdue: 0,
  due_soon: 1,
  needs_baseline: 2,
  upcoming: 3,
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

const sortRowsByPriority = (rows: ScheduleProjectionRow[]): ScheduleProjectionRow[] =>
  [...rows].sort((left, right) => {
    const rankDelta = statusRank[left.status] - statusRank[right.status];
    if (rankDelta !== 0) return rankDelta;
    if (left.dueDate && right.dueDate) return left.dueDate.localeCompare(right.dueDate);
    if (left.dueDate) return -1;
    if (right.dueDate) return 1;
    return left.serviceName.localeCompare(right.serviceName);
  });

const groupRowsBySystem = (rows: ScheduleProjectionRow[]): [string, ScheduleProjectionRow[]][] => {
  const map = new Map<string, ScheduleProjectionRow[]>();
  for (const row of rows) {
    const bucket = map.get(row.systemGroup) ?? [];
    bucket.push(row);
    map.set(row.systemGroup, bucket);
  }

  const orderedGroups = SYSTEM_GROUP_ORDER.filter((group) => map.has(group));
  const extraGroups = [...map.keys()]
    .filter((group) => !SYSTEM_GROUP_ORDER.includes(group as (typeof SYSTEM_GROUP_ORDER)[number]))
    .sort((left, right) => left.localeCompare(right));

  return [...orderedGroups, ...extraGroups].map((group) => [
    group,
    sortRowsByPriority(map.get(group) ?? []),
  ]);
};

const groupNeedsAttention = (rows: ScheduleProjectionRow[]): boolean =>
  rows.some((row) => row.status === "overdue" || row.status === "due_soon" || row.status === "needs_baseline");

const initialExpandedGroups = (groups: [string, ScheduleProjectionRow[]][]): Record<string, boolean> =>
  Object.fromEntries(
    groups.map(([group, groupRows]) => [group, groupNeedsAttention(groupRows)]),
  );

function ScheduleRowBadges({ row }: { row: ScheduleProjectionRow }) {
  return (
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
    </div>
  );
}

function ScheduleMobileStrip({ rows }: { rows: ScheduleProjectionRow[] }) {
  const stripRows = useMemo(() => sortRowsByPriority(rows).slice(0, 8), [rows]);

  if (stripRows.length === 0) return null;

  return (
    <div className="space-y-2 md:hidden">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Next on schedule
      </p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        {stripRows.map((row) => (
          <article
            key={row.entryId}
            className="min-w-[11.5rem] shrink-0 rounded-lg border border-border bg-background p-3 shadow-sm"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug">{row.serviceName}</p>
                <Badge variant={statusVariant(row.status)} className="shrink-0 text-[10px]">
                  {statusLabel[row.status]}
                </Badge>
              </div>
              <p className="text-xs tabular-nums text-muted-foreground">{formatDueDate(row.dueDate)}</p>
              {row.dueMileage ? (
                <p className="text-[11px] tabular-nums text-muted-foreground">
                  Also by {row.dueMileage.toLocaleString()} mi
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ScheduleGroupCards({ rows }: { rows: ScheduleProjectionRow[] }) {
  return (
    <div className="space-y-2 md:hidden">
      {rows.map((row) => (
        <article key={row.entryId} className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="font-medium">{row.serviceName}</p>
              <ScheduleRowBadges row={row} />
            </div>
            <Badge variant={statusVariant(row.status)}>{statusLabel[row.status]}</Badge>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Due date</dt>
              <dd className="tabular-nums">{formatDueDate(row.dueDate)}</dd>
            </div>
            <div className="text-right">
              <dt className="text-muted-foreground">Mileage note</dt>
              <dd className="tabular-nums text-muted-foreground">
                {row.dueMileage ? `${row.dueMileage.toLocaleString()} mi` : "—"}
              </dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

function ScheduleGroupTable({ rows }: { rows: ScheduleProjectionRow[] }) {
  return (
    <Table className="hidden md:table">
      <TableHeader>
        <TableRow>
          <TableHead>Service</TableHead>
          <TableHead>Due date</TableHead>
          <TableHead className="text-right">Mileage note</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.entryId}>
            <TableCell>
              <div className="space-y-1">
                <p className="font-medium">{row.serviceName}</p>
                <ScheduleRowBadges row={row} />
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
  );
}

type ScheduleSystemGroupProps = {
  group: string;
  rows: ScheduleProjectionRow[];
  isExpanded: boolean;
  onToggle: () => void;
};

function ScheduleSystemGroup({ group, rows, isExpanded, onToggle }: ScheduleSystemGroupProps) {
  const attentionCount = rows.filter(
    (row) => row.status === "overdue" || row.status === "due_soon" || row.status === "needs_baseline",
  ).length;

  return (
    <section className="overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 bg-muted/20 px-3 py-3 text-left transition-colors hover:bg-muted/35"
        aria-expanded={isExpanded}
        onClick={onToggle}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{group}</p>
          <p className="text-sm text-foreground">
            {rows.length} service{rows.length === 1 ? "" : "s"}
            {attentionCount > 0 ? (
              <span className="text-muted-foreground"> · {attentionCount} need attention</span>
            ) : null}
          </p>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isExpanded && "rotate-180")}
          aria-hidden
        />
      </button>

      {isExpanded ? (
        <div className="border-t border-border p-3">
          <ScheduleGroupCards rows={rows} />
          <ScheduleGroupTable rows={rows} />
        </div>
      ) : null}
    </section>
  );
}

export function MaintenanceScheduleConsole({
  nearRows,
  extendedRows,
  effectiveMilesPerYear,
}: MaintenanceScheduleConsoleProps) {
  const [showFullYear, setShowFullYear] = useState(false);
  const rows = showFullYear ? extendedRows : nearRows;
  const grouped = useMemo(() => groupRowsBySystem(rows), [rows]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    initialExpandedGroups(grouped),
  );

  useEffect(() => {
    setExpandedGroups((current) => {
      const next = initialExpandedGroups(grouped);
      for (const [group, isExpanded] of Object.entries(current)) {
        if (group in next && !next[group]) {
          next[group] = isExpanded;
        }
      }
      return next;
    });
  }, [grouped]);

  if (nearRows.length === 0 && extendedRows.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No OEM schedule yet"
        description="Upload and confirm your owner manual under Manual & OEM to project upcoming maintenance."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Forward OEM intervals · assumes{" "}
          <span className="font-medium text-foreground">{effectiveMilesPerYear.toLocaleString()} mi/year</span> for
          mileage-only rows
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowFullYear((current) => !current)}>
          {showFullYear ? "Show 3 months" : "Show full year"}
        </Button>
      </div>

      <ScheduleMobileStrip rows={rows} />

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Nothing due in the next {showFullYear ? "12" : "3"} months. Expand horizon or add OEM manual intervals.
        </p>
      ) : (
        <div className="space-y-3">
          {grouped.map(([group, groupRows]) => (
            <ScheduleSystemGroup
              key={group}
              group={group}
              rows={groupRows}
              isExpanded={expandedGroups[group] ?? groupNeedsAttention(groupRows)}
              onToggle={() =>
                setExpandedGroups((current) => ({
                  ...current,
                  [group]: !(current[group] ?? groupNeedsAttention(groupRows)),
                }))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
