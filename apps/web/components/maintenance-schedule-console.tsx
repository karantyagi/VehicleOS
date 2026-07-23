"use client";

import { useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
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

const statusLabel: Record<ScheduleProjectionRow["status"], string> = {
  overdue: "Overdue",
  due_soon: "Due soon",
  upcoming: "Upcoming",
  needs_baseline: "Needs baseline",
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

export function MaintenanceScheduleConsole({
  nearRows,
  extendedRows,
  effectiveMilesPerYear,
}: MaintenanceScheduleConsoleProps) {
  const [showFullYear, setShowFullYear] = useState(false);
  const rows = showFullYear ? extendedRows : nearRows;

  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleProjectionRow[]>();
    for (const row of rows) {
      const bucket = map.get(row.systemGroup) ?? [];
      bucket.push(row);
      map.set(row.systemGroup, bucket);
    }
    return [...map.entries()];
  }, [rows]);

  if (nearRows.length === 0 && extendedRows.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No OEM schedule yet"
        description="Upload and confirm your owner manual under Add context to project upcoming maintenance."
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

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Nothing due in the next {showFullYear ? "12" : "3"} months. Expand horizon or add OEM manual intervals.
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
