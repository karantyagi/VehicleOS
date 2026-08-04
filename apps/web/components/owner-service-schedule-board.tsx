"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarClock, ChevronDown, ChevronUp } from "lucide-react";
import type {
  OwnerContextMemory,
  OwnerDueItem,
  OwnerDueItemsView,
  OwnerServiceScheduleRow,
  OwnerServiceVerdict,
  OwnershipRenewalProjection,
} from "@vehicleos/domain";
import {
  mergeIntervalOverlayMemory,
  mergeServiceBenefitMemory,
  removeIntervalOverlayMemory,
} from "@vehicleos/domain";
import { EmptyState } from "@/components/empty-state";
import { MaintenanceIntelligenceSummary } from "@/components/maintenance-intelligence-summary";
import { MaintenanceItemTrustActions } from "@/components/maintenance-item-trust-actions";
import type { MaintenanceRecordDraft } from "@/components/maintenance-record-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isoDateToLocalDate, todayIsoDate } from "@/lib/date-input";
import type { TimelineEntry } from "@/lib/console-types";
import { cn } from "@/lib/utils";

type OwnerServiceScheduleBoardProps = {
  dueItems: OwnerDueItemsView | null;
  currentMileage: number;
  hasKnowledgeSchedule?: boolean;
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
};

type GroupFilter = "All" | "Engine" | "Fluids" | "Filters" | "Brakes" | "Tires" | "Other";
type TimeGroup = "overdue" | "this_week" | "next_three_weeks" | "later";

const GROUP_FILTERS: GroupFilter[] = ["All", "Engine", "Fluids", "Filters", "Brakes", "Tires", "Other"];

const TIME_GROUPS: { id: TimeGroup; label: string; defaultOpen: boolean }[] = [
  { id: "overdue", label: "Overdue", defaultOpen: true },
  { id: "this_week", label: "This week", defaultOpen: true },
  { id: "next_three_weeks", label: "Next 3 weeks", defaultOpen: false },
  { id: "later", label: "Later / on track", defaultOpen: false },
];

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

const calendarDaysBetween = (from: string, to: string): number | null => {
  const fromDate = isoDateToLocalDate(from);
  const toDate = isoDateToLocalDate(to);
  if (!fromDate || !toDate) return null;

  const fromUtc = Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const toUtc = Date.UTC(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  return Math.round((toUtc - fromUtc) / 86_400_000);
};

const formatElapsedTime = (days: number): string => {
  if (days <= 7) return "1 week";
  if (days <= 14) return "2 weeks";
  if (days <= 21) return "3 weeks";
  return "1 month+";
};

const timeFirstVerdictLabel = (row: OwnerServiceScheduleRow, today = todayIsoDate()): string => {
  if (row.verdict === "overdue") {
    const daysOverdue = row.dueDate ? calendarDaysBetween(row.dueDate, today) : null;
    if (daysOverdue && daysOverdue > 0) return `Overdue by ${formatElapsedTime(daysOverdue)}`;
    return row.dueMileage ? "Overdue by mileage" : "Overdue";
  }

  if (row.verdict !== "due_soon") return verdictLabel[row.verdict];
  if (!row.dueDate) return "Due soon by mileage";

  const daysUntil = calendarDaysBetween(today, row.dueDate);
  if (daysUntil === null) return "Due soon";
  if (daysUntil <= 0) return "Due today";

  const todayDate = isoDateToLocalDate(today);
  const daysThroughSunday = todayDate ? (7 - todayDate.getDay()) % 7 : 0;
  if (daysUntil <= daysThroughSunday) return "Due this week";

  return `Due in ${formatElapsedTime(daysUntil)}`;
};

const timeGroupForDueItem = (item: OwnerDueItem, today = todayIsoDate()): TimeGroup => {
  if (item.verdict === "overdue") return "overdue";
  if (item.verdict !== "due_soon") return "later";
  if (!item.dueDate) return "this_week";

  const daysUntil = calendarDaysBetween(today, item.dueDate);
  if (daysUntil === null || daysUntil <= 0) return "this_week";

  const todayDate = isoDateToLocalDate(today);
  const daysThroughSunday = todayDate ? (7 - todayDate.getDay()) % 7 : 0;
  if (daysUntil <= daysThroughSunday) return "this_week";
  if (daysUntil <= 21) return "next_three_weeks";
  return "later";
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
  const clampMileage = (mileage: number) => Math.max(0, Math.min(mileage, TIMELINE_MAX_MI));
  const x = (mi: number) => pad + (clampMileage(mi) / TIMELINE_MAX_MI) * (width - pad * 2);
  const nowX = x(currentMileage);
  const timelineLabel = [
    `${events.length} completed service ${events.length === 1 ? "event" : "events"}`,
    `current odometer ${formatMi(currentMileage)}`,
    nextMileage ? `next service projected at ${formatMi(nextMileage)}` : null,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <div role="img" aria-label={timelineLabel}>
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full max-w-2xl text-muted-foreground" aria-hidden>
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
            cx={x(event.mileage)}
            cy={trackY}
            r={4}
            fill="hsl(var(--primary))"
          />
        ))}
      </svg>
    </div>
  );
}

function ServiceJourney({ row, currentMileage }: { row: OwnerServiceScheduleRow; currentMileage: number }) {
  if (row.historyEvents.length === 0) return null;

  return (
    <section className="space-y-3 rounded-lg border border-border/70 bg-background/65 p-3.5" aria-labelledby={`service-journey-${row.entryId}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p id={`service-journey-${row.entryId}`} className="text-sm font-semibold text-foreground">
            Service journey
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Completed service → current odometer → projected next service</p>
        </div>
        <Badge variant="secondary">
          {row.historyEvents.length} record{row.historyEvents.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <MileageTimeline events={row.historyEvents} nextMileage={row.dueMileage} currentMileage={currentMileage} />

      <dl className="grid gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-md bg-muted/45 px-2.5 py-2">
          <dt className="font-medium text-muted-foreground">Last completed</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-foreground">
            {formatMi(row.serviceBaseline.performedMileage ?? row.historyEvents[0]?.mileage)}
          </dd>
        </div>
        <div className="rounded-md bg-primary/[0.06] px-2.5 py-2">
          <dt className="font-medium text-muted-foreground">Current</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-foreground">{formatMi(currentMileage)}</dd>
        </div>
        <div className="rounded-md bg-muted/45 px-2.5 py-2">
          <dt className="font-medium text-muted-foreground">Next due</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-foreground">
            {row.dueMileage ? formatMi(row.dueMileage) : formatDate(row.dueDate)}
          </dd>
        </div>
      </dl>

      <div className="overflow-x-auto rounded-lg border border-border/70">
        <Table className="min-w-[38rem]">
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
                <TableCell className="min-w-[16rem] whitespace-normal">{event.lineItem}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function MaintenanceDueCard({
  row,
  currentMileage,
  open,
  onOpenChange,
  disabled = false,
  serviceTimeline = [],
  focusedEntryId = null,
  ownerContextMemory,
  onSaveOwnerContextMemory,
  onAddService,
  onUpdateService,
  onUpdateCurrentMileage,
}: {
  row: OwnerServiceScheduleRow;
  currentMileage: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
}) {
  const [intervalInput, setIntervalInput] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const intelligence = row.intelligence;
  const interval = intelligence?.intervalRecommendation;
  const action = intelligence?.actionRecommendation;
  const baselineEntry = intelligence?.serviceAction.baselineServiceId
    ? serviceTimeline.find(
        (entry) => entry.serviceId === intelligence.serviceAction.baselineServiceId,
      ) ?? null
    : null;
  const ownerInterval =
    ownerContextMemory?.intervalOverlays?.[row.entryId]?.intervalMiles ?? null;
  const urgencyLabel = timeFirstVerdictLabel(row);
  const dueLineLabel = row.verdict === "overdue" || row.verdict === "due_soon" ? urgencyLabel : "Next due";

  useEffect(() => {
    const nextValue = ownerInterval ?? interval?.recommendedMiles ?? null;
    setIntervalInput(nextValue ? String(nextValue) : "");
  }, [interval?.recommendedMiles, ownerInterval]);

  useEffect(() => {
    if (focusedEntryId !== row.entryId || !open) return;
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(`maintenance-item-${row.entryId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusedEntryId, open, row.entryId]);

  const persistOwnerContext = async (
    memory: OwnerContextMemory,
    successMessage: string,
  ) => {
    if (!onSaveOwnerContextMemory) return;
    setSaveError("");
    setIsSaving(true);
    try {
      await onSaveOwnerContextMemory(memory, successMessage);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not save this preference.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const saveInterval = async (miles: number) => {
    if (!Number.isFinite(miles) || miles < 500 || miles > 50_000) {
      setSaveError("Enter 500–50,000 miles.");
      return;
    }

    const roundedMiles = Math.round(miles);
    setIntervalInput(String(roundedMiles));
    await persistOwnerContext(
      mergeIntervalOverlayMemory({
        memory: ownerContextMemory,
        entryId: row.entryId,
        overlay: {
          basis: "mileage",
          intervalMiles: roundedMiles,
          intervalMonths: null,
          label: `Every ${roundedMiles.toLocaleString("en-US")} mi`,
          confirmedAt: new Date().toISOString(),
        },
      }),
      `Owner interval saved at ${roundedMiles.toLocaleString("en-US")} miles.`,
    );
  };

  const restoreOem = async () => {
    await persistOwnerContext(
      removeIntervalOverlayMemory({
        memory: ownerContextMemory,
        entryId: row.entryId,
      }),
      "OEM interval restored.",
    );
  };

  const confirmServiceBenefit = async () => {
    if (!action?.providerName) return;
    await persistOwnerContext(
      mergeServiceBenefitMemory({
        memory: ownerContextMemory,
        canonicalServiceId: "generic.tire_rotation",
        benefit: {
          providerName: action.providerName,
          ...(action.providerLocation
            ? { providerLocation: action.providerLocation }
            : {}),
          benefitLabel: "Current tire purchase includes rotations",
          expectedCost: 0,
          currency: "USD",
          confirmedAt: new Date().toISOString(),
        },
      }),
      "$0 tire-rotation benefit confirmed.",
    );
  };

  return (
    <article
      id={`maintenance-item-${row.entryId}`}
      className={cn("overflow-hidden rounded-xl border shadow-sm transition-colors", verdictAccentClass(row.verdict))}
    >
      <button
        type="button"
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left sm:px-5 sm:py-4"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {row.usesOwnerOverlay ? "Owner interval" : "OEM interval"}
            </span>
            {row.mmCode ? (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                MM {row.mmCode}
              </span>
            ) : null}
            <Badge variant={verdictBadgeVariant(row.verdict)}>{urgencyLabel}</Badge>
          </div>
          <h3 className="mt-1.5 text-base font-semibold tracking-tight text-foreground">{row.displayName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {interval?.activeLabel ?? row.oemRuleLabel}
          </p>
          <p className="mt-1 text-sm tabular-nums text-muted-foreground">
            {dueLineLabel}
            {row.dueDate ? ` · ${formatDate(row.dueDate)}` : ""}
            {row.dueMileage ? ` · ${formatMi(row.dueMileage)}` : ""}
          </p>
        </div>
        <div className="shrink-0 pt-1 text-muted-foreground">
          {open ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
        </div>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-border/60 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Last done</p>
              <p className="mt-1 text-sm font-medium tabular-nums">
                {row.serviceBaseline.performedDate
                  ? `${formatDate(row.serviceBaseline.performedDate)} · ${formatMi(row.serviceBaseline.performedMileage)}`
                  : "No match in history"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{dueLineLabel}</p>
              <p className="mt-1 text-sm font-medium tabular-nums">
                {formatDate(row.dueDate)}
                {row.dueMileage ? ` · ${formatMi(row.dueMileage)}` : ""}
              </p>
            </div>
          </div>

          <ServiceJourney row={row} currentMileage={currentMileage} />

          {intelligence ? (
            <MaintenanceIntelligenceSummary
              intelligence={intelligence}
              showInterval={false}
              showAction={false}
            />
          ) : null}

          {intelligence?.itemKind === "tire_rotation" &&
          interval?.status === "active" &&
          interval.recommendedMiles ? (
            <section className="rounded-lg border border-primary/25 bg-primary/[0.035] p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Assistant recommends{" "}
                    {interval.recommendedMiles.toLocaleString("en-US")} miles
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {interval.evidenceNote} · {interval.confidence} confidence
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {interval.rationale}
                  </p>
                </div>
                <Badge variant="outline">
                  Active: {interval.activeSource === "owner" ? "Owner" : "OEM"}
                </Badge>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
                <label className="space-y-1 text-xs font-medium text-foreground">
                  My tire-rotation interval
                  <Input
                    type="number"
                    min={500}
                    max={50_000}
                    step={500}
                    inputMode="numeric"
                    value={intervalInput}
                    disabled={disabled || isSaving}
                    onChange={(event) => setIntervalInput(event.target.value)}
                    aria-label="My tire-rotation interval in miles"
                  />
                </label>
                <Button
                  type="button"
                  size="sm"
                  disabled={disabled || isSaving || !onSaveOwnerContextMemory}
                  onClick={() => void saveInterval(Number(intervalInput))}
                >
                  Save interval
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={disabled || isSaving || !onSaveOwnerContextMemory}
                  onClick={() => void saveInterval(interval.recommendedMiles!)}
                >
                  Use {interval.recommendedMiles.toLocaleString("en-US")}
                </Button>
              </div>

              {row.usesOwnerOverlay ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-2 px-0 text-xs"
                  disabled={disabled || isSaving || !onSaveOwnerContextMemory}
                  onClick={() => void restoreOem()}
                >
                  Restore OEM interval
                </Button>
              ) : null}
              {saveError ? (
                <p className="mt-2 text-xs text-destructive">{saveError}</p>
              ) : null}
            </section>
          ) : intelligence ? (
            <MaintenanceIntelligenceSummary
              intelligence={intelligence}
              showWhy={false}
              showAction={false}
            />
          ) : null}

          {intelligence ? (
            <MaintenanceIntelligenceSummary
              intelligence={intelligence}
              showWhy={false}
              showInterval={false}
            />
          ) : null}

          {action?.expectedCost.requiresConfirmation ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2.5">
              <p className="text-xs text-foreground">
                {action.confirmationPrompt}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled || isSaving || !onSaveOwnerContextMemory}
                onClick={() => void confirmServiceBenefit()}
              >
                Confirm $0 benefit
              </Button>
            </div>
          ) : null}

          {intelligence?.itemKind === "tire_rotation" ? (
            <MaintenanceItemTrustActions
              entryId={row.entryId}
              recordLineItem={intelligence.serviceAction.recordLineItem}
              currentMileage={currentMileage}
              baselineEntry={baselineEntry}
              disabled={disabled}
              onRecordService={onAddService}
              onCorrectService={onUpdateService}
              onUpdateMileage={onUpdateCurrentMileage}
            />
          ) : null}

        </div>
      ) : null}
    </article>
  );
}

function OwnershipDueCard({
  renewal,
  open,
  onOpenChange,
}: {
  renewal: OwnershipRenewalProjection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const verdict: OwnerServiceVerdict = renewal.status;

  return (
    <article className={cn("overflow-hidden rounded-xl border shadow-sm transition-colors", verdictAccentClass(verdict))}>
      <button
        type="button"
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left sm:px-5 sm:py-4"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Owner · RMV
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
        <div className="space-y-3 border-t border-border/60 px-4 pb-4 pt-3 text-sm text-muted-foreground sm:px-5 sm:pb-5">
          <section className="rounded-lg border border-border/70 bg-background/75 p-3.5">
            <p className="font-semibold text-foreground">Why this needs attention</p>
            <p className="mt-1">
              {renewal.title} expires {formatDate(renewal.expirationDate)}. This credential belongs to you, not a vehicle; the date comes from your {renewal.agency} record.
            </p>
          </section>
          <section className="rounded-lg border border-border/70 bg-background/75 p-3.5">
            <p className="font-semibold text-foreground">Recommended way to get it done</p>
            <p className="mt-1">Phase 2 · upcoming · in development for this ownership item.</p>
          </section>
          <details className="rounded-lg border border-border/70 bg-background/65">
            <summary className="cursor-pointer px-3.5 py-3 font-medium text-foreground">
              Source detail
            </summary>
            <div className="border-t border-border/60 px-3.5 py-3">
              <p>{renewal.description}</p>
              <p className="mt-2 text-xs uppercase tracking-wide">Past RMV records appear in History</p>
            </div>
          </details>
        </div>
      ) : null}
    </article>
  );
}

function OwnerDueItemCard({
  item,
  open,
  onOpenChange,
  currentMileage,
  disabled,
  serviceTimeline,
  focusedEntryId,
  ownerContextMemory,
  onSaveOwnerContextMemory,
  onAddService,
  onUpdateService,
  onUpdateCurrentMileage,
}: {
  item: OwnerDueItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMileage: number;
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
}) {
  if (item.kind === "ownership" && item.ownershipRenewal) {
    return <OwnershipDueCard renewal={item.ownershipRenewal} open={open} onOpenChange={onOpenChange} />;
  }
  if (item.kind === "maintenance" && item.maintenanceRow) {
    return (
      <MaintenanceDueCard
        row={item.maintenanceRow}
        currentMileage={currentMileage}
        open={open}
        onOpenChange={onOpenChange}
        disabled={disabled}
        serviceTimeline={serviceTimeline}
        focusedEntryId={focusedEntryId}
        ownerContextMemory={ownerContextMemory}
        onSaveOwnerContextMemory={onSaveOwnerContextMemory}
        onAddService={onAddService}
        onUpdateService={onUpdateService}
        onUpdateCurrentMileage={onUpdateCurrentMileage}
      />
    );
  }
  return null;
}

export function OwnerServiceScheduleBoardView({
  dueItems,
  currentMileage,
  hasKnowledgeSchedule = false,
  disabled = false,
  serviceTimeline = [],
  focusedEntryId = null,
  ownerContextMemory,
  onSaveOwnerContextMemory,
  onAddService,
  onUpdateService,
  onUpdateCurrentMileage,
}: OwnerServiceScheduleBoardProps) {
  const [group, setGroup] = useState<GroupFilter>("All");
  const [openTimeGroups, setOpenTimeGroups] = useState<Record<TimeGroup, boolean>>(() =>
    Object.fromEntries(TIME_GROUPS.map((timeGroup) => [timeGroup.id, timeGroup.defaultOpen])) as Record<TimeGroup, boolean>,
  );

  const focusedItemId = useMemo(
    () =>
      dueItems?.items.find(
        (item) => item.kind === "maintenance" && item.maintenanceRow?.entryId === focusedEntryId,
      )?.id ?? null,
    [dueItems, focusedEntryId],
  );
  const [openItemId, setOpenItemId] = useState<string | null>(focusedItemId);

  useEffect(() => {
    if (focusedItemId) setOpenItemId(focusedItemId);
  }, [focusedItemId]);

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

  const today = todayIsoDate();
  const itemsByTimeGroup = useMemo(() => {
    const items = new Map<TimeGroup, OwnerDueItem[]>(TIME_GROUPS.map((timeGroup) => [timeGroup.id, []]));
    for (const item of filteredItems) {
      items.get(timeGroupForDueItem(item, today))?.push(item);
    }
    return items;
  }, [filteredItems, today]);

  const focusedTimeGroup = useMemo(() => {
    const focusedItem = filteredItems.find((item) => item.id === focusedItemId);
    return focusedItem ? timeGroupForDueItem(focusedItem, today) : null;
  }, [filteredItems, focusedItemId, today]);

  useEffect(() => {
    if (!focusedTimeGroup) return;
    setOpenTimeGroups((current) =>
      current[focusedTimeGroup] ? current : { ...current, [focusedTimeGroup]: true },
    );
  }, [focusedTimeGroup]);

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
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Overdue</p>
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
            . Open one item to see its complete service journey.
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">RMV / DMV renewals</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Registration, inspection, and driver license due dates from your RMV import — unified with OEM maintenance below when
            loaded.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {TIME_GROUPS.map((timeGroup) => {
          const items = itemsByTimeGroup.get(timeGroup.id) ?? [];
          if (items.length === 0) return null;

          const isOpen = openTimeGroups[timeGroup.id];
          const panelId = `maintenance-time-group-${timeGroup.id}`;

          return (
            <section key={timeGroup.id} className="overflow-hidden rounded-xl border border-border/70 bg-card/90">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-5"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() =>
                  setOpenTimeGroups((current) => ({ ...current, [timeGroup.id]: !current[timeGroup.id] }))
                }
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{timeGroup.label}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                    {items.length}
                  </span>
                </span>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
              </button>

              <div id={panelId} hidden={!isOpen} className="space-y-3 border-t border-border/60 p-3 sm:p-4">
                {items.map((item) => (
                  <OwnerDueItemCard
                    key={item.id}
                    item={item}
                    open={openItemId === item.id}
                    onOpenChange={(open) => setOpenItemId(open ? item.id : null)}
                    currentMileage={currentMileage}
                    disabled={disabled}
                    serviceTimeline={serviceTimeline}
                    focusedEntryId={focusedEntryId}
                    ownerContextMemory={ownerContextMemory}
                    onSaveOwnerContextMemory={onSaveOwnerContextMemory}
                    onAddService={onAddService}
                    onUpdateService={onUpdateService}
                    onUpdateCurrentMileage={onUpdateCurrentMileage}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Schedule assumes {(dueItems.effectiveMilesPerYear ?? 12_000).toLocaleString()} mi/year for mileage-only OEM
        intervals. Due dates use your imported history when available — deterministic, not AI-generated.
      </p>
    </div>
  );
}
