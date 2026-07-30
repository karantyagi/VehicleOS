"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CalendarClock, ChevronDown, ChevronUp } from "lucide-react";
import type {
  OwnerDueItem,
  OwnerDueItemsView,
  OwnerServiceScheduleRow,
  OwnerServiceVerdict,
  OwnershipRenewalProjection,
} from "@vehicleos/domain";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isoDateToLocalDate } from "@/lib/date-input";
import { cn } from "@/lib/utils";

type OwnerServiceScheduleBoardProps = {
  dueItems: OwnerDueItemsView | null;
  currentMileage: number;
  hasKnowledgeSchedule?: boolean;
};

type GroupFilter = "All" | "Engine" | "Fluids" | "Filters" | "Brakes" | "Tires" | "Other";

const GROUP_FILTERS: GroupFilter[] = ["All", "Engine", "Fluids", "Filters", "Brakes", "Tires", "Other"];

const TIMELINE_MAX_MI = 100_000;

const verdictLabel: Record<OwnerServiceVerdict, string> = {
  overdue: "Overdue",
  due_soon: "Due soon",
  current: "Current",
  monitor: "Monitor",
  skip: "Skip",
  needs_baseline: "Needs history",
};

const verdictBadgeVariant = (verdict: OwnerServiceVerdict) => {
  if (verdict === "overdue") return "warning" as const;
  if (verdict === "due_soon") return "oem" as const;
  if (verdict === "needs_baseline") return "outline" as const;
  if (verdict === "monitor") return "secondary" as const;
  return "secondary" as const;
};

const verdictAccentClass = (verdict: OwnerServiceVerdict) => {
  if (verdict === "overdue") return "border-destructive/40 bg-destructive/5";
  if (verdict === "due_soon") return "border-primary/35 bg-primary/5";
  if (verdict === "needs_baseline") return "border-border/80 bg-muted/20";
  return "border-border/70 bg-card/90";
};

const formatDate = (iso: string | null): string => {
  if (!iso) return "—";
  const date = isoDateToLocalDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatMi = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString()} mi`;
};

const inferGroup = (row: OwnerServiceScheduleRow): GroupFilter => {
  const group = row.systemGroup;
  if (group === "Engine") return "Engine";
  if (group === "Fluids") return "Fluids";
  if (group === "Filters") return "Filters";
  if (group === "Brakes") return "Brakes";
  if (group === "Tires") return "Tires";
  return "Other";
};

function MileageTimeline({
  events,
  nextMileage,
  currentMileage,
}: {
  events: OwnerServiceScheduleRow["historyEvents"];
  nextMileage: number | null;
  currentMileage: number;
}) {
  const pad = 20;
  const width = 560;
  const height = 52;
  const trackY = 26;
  const x = (mi: number) => pad + (mi / TIMELINE_MAX_MI) * (width - pad * 2);
  const nowX = x(Math.min(currentMileage, TIMELINE_MAX_MI));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full max-w-2xl text-muted-foreground">
      <line
        x1={pad}
        y1={trackY}
        x2={width - pad}
        y2={trackY}
        stroke="currentColor"
        strokeOpacity={0.25}
        strokeWidth={2}
      />
      {[0, 25_000, 50_000, 75_000, 100_000].map((mi) => (
        <g key={mi}>
          <line
            x1={x(mi)}
            y1={trackY - 3}
            x2={x(mi)}
            y2={trackY + 3}
            stroke="currentColor"
            strokeOpacity={0.2}
            strokeWidth={1}
          />
          <text x={x(mi)} y={height - 2} textAnchor="middle" fill="currentColor" fillOpacity={0.45} fontSize={9}>
            {mi === 0 ? "0" : `${mi / 1000}k`}
          </text>
        </g>
      ))}
      <line
        x1={nowX}
        y1={6}
        x2={nowX}
        y2={height - 8}
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        strokeDasharray="3 3"
      />
      {nextMileage ? (
        <g>
          <circle
            cx={x(nextMileage)}
            cy={trackY}
            r={5}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.55}
            strokeWidth={1.5}
          />
          <text x={x(nextMileage)} y={trackY - 10} textAnchor="middle" fill="currentColor" fillOpacity={0.55} fontSize={8}>
            next
          </text>
        </g>
      ) : null}
      {events.map((event, index) => (
        <circle
          key={`${event.serviceId}-${event.serviceDate}-${index}`}
          cx={x(Math.min(event.mileage, TIMELINE_MAX_MI))}
          cy={trackY}
          r={4}
          fill="hsl(var(--primary))"
        >
          <title>{`${formatDate(event.serviceDate)} · ${formatMi(event.mileage)} · ${event.shop}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function MaintenanceDueCard({ row, currentMileage }: { row: OwnerServiceScheduleRow; currentMileage: number }) {
  const [open, setOpen] = useState(false);

  return (
    <article className={cn("overflow-hidden rounded-xl border shadow-sm transition-colors", verdictAccentClass(row.verdict))}>
      <button
        type="button"
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left sm:px-5 sm:py-4"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              OEM
            </span>
            {row.mmCode ? (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                MM {row.mmCode}
              </span>
            ) : null}
            <Badge variant={verdictBadgeVariant(row.verdict)}>{verdictLabel[row.verdict]}</Badge>
          </div>
          <h3 className="mt-1.5 text-base font-semibold tracking-tight text-foreground">{row.displayName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{row.oemRuleLabel}</p>
          <p className="mt-1 text-sm tabular-nums text-muted-foreground">
            Next {formatDate(row.dueDate)}
            {row.dueMileage ? ` · ${formatMi(row.dueMileage)}` : ""}
          </p>
        </div>
        <div className="shrink-0 pt-1 text-muted-foreground">
          {open ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
        </div>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-border/60 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
          <MileageTimeline events={row.historyEvents} nextMileage={row.dueMileage} currentMileage={currentMileage} />

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Last done</p>
              <p className="mt-1 text-sm font-medium tabular-nums">
                {row.serviceBaseline.performedDate
                  ? `${formatDate(row.serviceBaseline.performedDate)} · ${formatMi(row.serviceBaseline.performedMileage)}`
                  : "No match in history"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Next due</p>
              <p className="mt-1 text-sm font-medium tabular-nums">
                {formatDate(row.dueDate)}
                {row.dueMileage ? ` · ${formatMi(row.dueMileage)}` : ""}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Assistant</p>
              <p className="mt-1 text-sm text-muted-foreground">{row.gapNote ?? "On track per OEM interval."}</p>
            </div>
          </div>

          {row.historyEvents.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Mileage</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead>Line item</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {row.historyEvents.map((event, index) => (
                    <TableRow key={`${event.serviceId}-${index}`}>
                      <TableCell className="whitespace-nowrap">{formatDate(event.serviceDate)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMi(event.mileage)}</TableCell>
                      <TableCell>{event.shop}</TableCell>
                      <TableCell className="max-w-[16rem] truncate">{event.lineItem}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function OwnershipDueCard({ renewal }: { renewal: OwnershipRenewalProjection }) {
  const [open, setOpen] = useState(false);
  const verdict: OwnerServiceVerdict = renewal.status === "overdue" ? "overdue" : "due_soon";

  return (
    <article className={cn("overflow-hidden rounded-xl border shadow-sm transition-colors", verdictAccentClass(verdict))}>
      <button
        type="button"
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left sm:px-5 sm:py-4"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              RMV
            </span>
            <Badge variant={verdictBadgeVariant(verdict)}>{verdictLabel[verdict]}</Badge>
          </div>
          <h3 className="mt-1.5 text-base font-semibold tracking-tight text-foreground">{renewal.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{renewal.agency}</p>
          <p className="mt-1 text-sm tabular-nums text-muted-foreground">Due {formatDate(renewal.expirationDate)}</p>
        </div>
        <div className="shrink-0 pt-1 text-muted-foreground">
          {open ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
        </div>
      </button>
      {open ? (
        <div className="border-t border-border/60 px-4 pb-4 pt-3 text-sm text-muted-foreground sm:px-5 sm:pb-5">
          <p>{renewal.description}</p>
          <p className="mt-2 text-xs uppercase tracking-wide">Past RMV records appear in History</p>
        </div>
      ) : null}
    </article>
  );
}

function OwnerDueItemCard({
  item,
  currentMileage,
}: {
  item: OwnerDueItem;
  currentMileage: number;
}) {
  if (item.kind === "ownership" && item.ownershipRenewal) {
    return <OwnershipDueCard renewal={item.ownershipRenewal} />;
  }
  if (item.kind === "maintenance" && item.maintenanceRow) {
    return <MaintenanceDueCard row={item.maintenanceRow} currentMileage={currentMileage} />;
  }
  return null;
}

export function OwnerServiceScheduleBoardView({
  dueItems,
  currentMileage,
  hasKnowledgeSchedule = false,
}: OwnerServiceScheduleBoardProps) {
  const [group, setGroup] = useState<GroupFilter>("All");

  const maintenanceRows = useMemo(
    () =>
      (dueItems?.items ?? [])
        .filter((item): item is OwnerDueItem & { maintenanceRow: OwnerServiceScheduleRow } =>
          item.kind === "maintenance" && Boolean(item.maintenanceRow),
        )
        .map((item) => item.maintenanceRow),
    [dueItems],
  );

  const filteredItems = useMemo(() => {
    if (!dueItems) return [];
    if (group === "All") return dueItems.items;

    const allowedGroups = new Set(
      maintenanceRows.filter((row) => inferGroup(row) === group).map((row) => row.entryId),
    );

    return dueItems.items.filter((item) => {
      if (item.kind === "ownership") {
        return item.verdict === "overdue" || item.verdict === "due_soon";
      }
      return item.maintenanceRow ? allowedGroups.has(item.maintenanceRow.entryId) : false;
    });
  }, [dueItems, group, maintenanceRows]);

  const summary = dueItems?.summary;
  const actionCount = (summary?.overdue ?? 0) + (summary?.dueSoon ?? 0);
  const hasMaintenanceRows = maintenanceRows.length > 0;
  const hasOwnershipDue = (summary?.ownershipOverdue ?? 0) + (summary?.ownershipDueSoon ?? 0) > 0;

  if (!dueItems || dueItems.items.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title={hasKnowledgeSchedule ? "Building your service schedule" : "No OEM schedule yet"}
        description={
          hasKnowledgeSchedule
            ? "Verified OEM intervals are loaded. Import CARFAX or confirm a service record to anchor due dates."
            : "Supported vehicles load verified OEM intervals automatically at setup."
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="history-surface grid gap-4 p-4 sm:grid-cols-4 sm:p-5">
        <div className="sm:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Your car</p>
          <p className="mt-2 text-lg font-semibold tracking-tight tabular-nums">{formatMi(currentMileage)}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Odometer</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Action now</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-destructive">{summary?.overdue ?? 0}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Due soon</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-primary">{summary?.dueSoon ?? 0}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current / monitor</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {(summary?.current ?? 0) + (summary?.monitor ?? 0)}
          </p>
        </div>
      </div>

      {actionCount > 0 ? (
        <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <p className="text-foreground">
            {summary?.maintenanceOverdue
              ? `${summary.maintenanceOverdue} service${summary.maintenanceOverdue === 1 ? "" : "s"} overdue`
              : null}
            {summary?.maintenanceOverdue && summary?.maintenanceDueSoon ? " · " : null}
            {summary?.maintenanceDueSoon
              ? `${summary.maintenanceDueSoon} due within your nudge window`
              : null}
            {hasOwnershipDue
              ? `${summary?.maintenanceOverdue || summary?.maintenanceDueSoon ? " · " : ""}${(summary?.ownershipOverdue ?? 0) + (summary?.ownershipDueSoon ?? 0)} RMV renewal${(summary?.ownershipOverdue ?? 0) + (summary?.ownershipDueSoon ?? 0) === 1 ? "" : "s"} due`
              : null}
            . Expand rows for CARFAX evidence and next due dates.
          </p>
        </div>
      ) : null}

      {hasMaintenanceRows ? (
        <div className="flex flex-wrap gap-2">
          {GROUP_FILTERS.map((filter) => {
            const count =
              filter === "All"
                ? maintenanceRows.length
                : maintenanceRows.filter((row) => inferGroup(row) === filter).length;
            if (filter !== "All" && count === 0) return null;
            return (
              <Button
                key={filter}
                type="button"
                size="sm"
                variant={group === filter ? "secondary" : "ghost"}
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => setGroup(filter)}
              >
                {filter}
                {filter !== "All" ? ` (${count})` : ""}
              </Button>
            );
          })}
        </div>
      ) : hasOwnershipDue ? (
        <div className="history-surface p-4 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">RMV renewals</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Registration and inspection due dates from your RMV import — unified with OEM maintenance below when
            loaded.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {filteredItems.map((item) => (
          <OwnerDueItemCard key={item.id} item={item} currentMileage={currentMileage} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Schedule assumes {(dueItems.effectiveMilesPerYear ?? 12_000).toLocaleString()} mi/year for mileage-only OEM
        intervals. Due dates use your imported history when available — deterministic, not AI-generated.
      </p>
    </div>
  );
}
