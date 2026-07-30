"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  Building2,
  ChevronRight,
  ChevronUp,
  Clock3,
  FileBadge2,
  FileJson,
  Mic,
  PenLine,
  Plus,
  Receipt,
  Wrench,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import {
  draftLineItems,
  emptyMaintenanceRecordDraft,
  MaintenanceRecordFields,
  type MaintenanceRecordDraft,
} from "@/components/maintenance-record-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OwnerHistoryItem, TimelineEntry } from "@/lib/console-types";
import { isoDateToLocalDate } from "@/lib/date-input";
import { RMV_EVENT_LABELS } from "@/lib/record-import-types";
import { cn } from "@/lib/utils";

type OwnerUnifiedHistoryTimelineProps = {
  items: OwnerHistoryItem[];
  disabled?: boolean;
  defaultMileage?: number;
  onUpdateService?: (serviceId: string, patch: Partial<TimelineEntry>) => Promise<void>;
  onAddService?: (draft: MaintenanceRecordDraft) => Promise<void>;
  requireEditConfirmation?: boolean;
  onGoToImport?: () => void;
};

const formatDate = (iso: string): string => {
  const date = isoDateToLocalDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const serviceEntryFromItem = (item: OwnerHistoryItem): TimelineEntry => ({
  serviceId: item.id,
  shop: item.shop ?? "Unknown shop",
  shopLocation: item.shopLocation,
  serviceDate: item.date,
  mileage: item.mileage ?? 0,
  lineItems: item.lineItems,
  total: item.total ?? "",
  evidenceIds: item.evidenceIds ?? [],
  source: item.source,
});

const isDiyShop = (shop: string): boolean => {
  const normalized = shop.trim().toLowerCase();
  return normalized.includes("self") || normalized.includes("diy");
};

const serviceIcon = (entry: TimelineEntry): ElementType => {
  if (isDiyShop(entry.shop)) return Wrench;
  if (entry.source === "receipt") return Receipt;
  if (entry.source === "voice") return Mic;
  if (entry.source === "owner_note") return PenLine;
  if (entry.source === "dealer") return Building2;
  return FileJson;
};

const groupByYear = (items: OwnerHistoryItem[]): [number, OwnerHistoryItem[]][] => {
  const groups = new Map<number, OwnerHistoryItem[]>();
  for (const item of items) {
    const year = Number(item.date.slice(0, 4)) || 0;
    const bucket = groups.get(year) ?? [];
    bucket.push(item);
    groups.set(year, bucket);
  }
  return [...groups.entries()].sort(([a], [b]) => b - a);
};

export function OwnerUnifiedHistoryTimeline({
  items,
  disabled = false,
  defaultMileage = 0,
  onUpdateService,
  onAddService,
  requireEditConfirmation = false,
  onGoToImport,
}: OwnerUnifiedHistoryTimelineProps) {
  const yearGroups = useMemo(() => groupByYear(items), [items]);
  const serviceItems = useMemo(() => items.filter((item) => item.kind === "service"), [items]);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(() => new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<MaintenanceRecordDraft | null>(null);
  const [confirmAdd, setConfirmAdd] = useState(false);
  const [isAddingSaving, setIsAddingSaving] = useState(false);

  useEffect(() => {
    if (yearGroups.length === 0) return;
    setExpandedYears((current) => (current.size > 0 ? current : new Set([yearGroups[0][0]])));
  }, [yearGroups]);

  const toggleYear = (year: number) => {
    setExpandedYears((current) => {
      const next = new Set(current);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const toggleCard = (id: string) => {
    setExpandedCards((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startAdding = () => {
    if (!onAddService || disabled) return;
    setIsAdding(true);
    setAddDraft(emptyMaintenanceRecordDraft(defaultMileage));
    setConfirmAdd(false);
  };

  const saveAdding = async () => {
    if (!onAddService || !addDraft || draftLineItems(addDraft).length === 0) return;
    setIsAddingSaving(true);
    try {
      await onAddService(addDraft);
      setIsAdding(false);
      setAddDraft(null);
      setConfirmAdd(false);
    } finally {
      setIsAddingSaving(false);
    }
  };

  if (items.length === 0 && !isAdding) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={Clock3}
          title="No history yet"
          description="Import CARFAX service history or RMV/DMV records — or add maintenance manually."
        />
        <div className="flex flex-wrap justify-center gap-2">
          {onAddService ? (
            <Button type="button" size="sm" disabled={disabled} onClick={startAdding}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              Add maintenance record
            </Button>
          ) : null}
          {onGoToImport ? (
            <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onGoToImport}>
              Import history
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Service visits and RMV/DMV ownership events in one timeline.
        </p>
        {onAddService && !isAdding ? (
          <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={startAdding}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            Add maintenance
          </Button>
        ) : null}
      </div>

      {serviceItems.length > 0 ? (
        <section className="history-surface p-4 sm:p-5">
          <dl className="flex gap-6 text-sm tabular-nums">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Service records</dt>
              <dd className="mt-0.5 font-semibold text-foreground">{serviceItems.length}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Ownership events</dt>
              <dd className="mt-0.5 font-semibold text-foreground">
                {items.length - serviceItems.length}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      {isAdding && addDraft ? (
        <div className="rounded-xl border history-interactive-active bg-card/90 p-4 shadow-sm">
          <MaintenanceRecordFields
            idPrefix="add-unified-maintenance"
            draft={addDraft}
            disabled={disabled}
            isSaving={isAddingSaving}
            saveLabel={requireEditConfirmation && !confirmAdd ? "Review save" : "Save record"}
            confirmMessage={
              requireEditConfirmation && confirmAdd ? "Tap save again to confirm this maintenance record." : null
            }
            onDraftChange={setAddDraft}
            onSave={() => {
              if (requireEditConfirmation && !confirmAdd) {
                setConfirmAdd(true);
                return;
              }
              void saveAdding();
            }}
            onCancel={() => {
              setIsAdding(false);
              setAddDraft(null);
              setConfirmAdd(false);
            }}
          />
        </div>
      ) : null}

      <div className="relative space-y-6">
        <div className="pointer-events-none absolute bottom-0 left-[0.4375rem] top-2 w-px bg-gradient-to-b from-history-highlight/35 via-history-highlight/12 to-transparent" />

        {yearGroups.map(([year, yearItems]) => {
          const isYearOpen = expandedYears.has(year);

          return (
            <section key={year} className="relative">
              <button
                type="button"
                className="group flex w-full items-center gap-2 rounded-lg py-1 pl-6 pr-2 text-left history-interactive"
                aria-expanded={isYearOpen}
                onClick={() => toggleYear(year)}
              >
                <span
                  className="absolute left-0 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-history-highlight shadow-[0_0_0_3px_hsl(var(--history-highlight)/0.18)]"
                  aria-hidden
                />
                {isYearOpen ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-history-highlight" aria-hidden />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-history-highlight" aria-hidden />
                )}
                <span className="text-base font-semibold tracking-tight text-foreground">{year}</span>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {yearItems.length} event{yearItems.length === 1 ? "" : "s"}
                </span>
              </button>

              {isYearOpen ? (
                <ul className="history-accent-rail mt-2 space-y-2.5">
                  {yearItems.map((item) => {
                    const isExpanded = expandedCards.has(item.id);
                    const isService = item.kind === "service";

                    if (isService) {
                      const entry = serviceEntryFromItem(item);
                      const Icon = serviceIcon(entry);
                      const location = entry.shopLocation?.trim();
                      const shopLine = location ? `${entry.shop} · ${location}` : entry.shop;

                      return (
                        <li
                          key={item.id}
                          className={cn(
                            "overflow-hidden rounded-xl border bg-card/90 shadow-sm",
                            isExpanded ? "history-interactive-active" : "border-border/70 history-interactive",
                          )}
                        >
                          <button
                            type="button"
                            className="flex w-full items-start gap-3 p-3.5 text-left sm:p-4"
                            aria-expanded={isExpanded}
                            onClick={() => toggleCard(item.id)}
                          >
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-history-highlight/10 text-history-highlight">
                              <Icon className="h-4 w-4" aria-hidden />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-lg font-semibold tracking-tight text-foreground">
                                  {formatDate(item.date)}
                                </p>
                                <Badge variant="secondary" className="shrink-0 text-[10px]">
                                  Service
                                </Badge>
                              </div>
                              <p className="mt-0.5 text-sm text-muted-foreground">{shopLine}</p>
                              <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
                                {(item.mileage ?? 0).toLocaleString()} mi
                              </p>
                              {!isExpanded && item.lineItems[0] ? (
                                <p className="mt-2 truncate text-sm text-muted-foreground">{item.lineItems[0]}</p>
                              ) : null}
                            </div>
                          </button>
                          {isExpanded ? (
                            <div className="border-t border-border/60 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4">
                              <ul className="space-y-1.5 text-sm text-foreground/85">
                                {item.lineItems.map((line) => (
                                  <li key={line}>{line}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </li>
                      );
                    }

                    const eventLabel = item.eventType ? RMV_EVENT_LABELS[item.eventType] : "Ownership";

                    return (
                      <li
                        key={item.id}
                        className={cn(
                          "overflow-hidden rounded-xl border bg-card/90 shadow-sm",
                          isExpanded ? "history-interactive-active" : "border-border/70 history-interactive",
                        )}
                      >
                        <button
                          type="button"
                          className="flex w-full items-start gap-3 p-3.5 text-left sm:p-4"
                          aria-expanded={isExpanded}
                          onClick={() => toggleCard(item.id)}
                        >
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileBadge2 className="h-4 w-4" aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-lg font-semibold tracking-tight text-foreground">
                                {formatDate(item.date)}
                              </p>
                              <Badge variant="oem" className="shrink-0 text-[10px]">
                                RMV
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {item.agency ?? "RMV/DMV"} · {eventLabel}
                            </p>
                            {!isExpanded && item.description ? (
                              <p className="mt-2 truncate text-sm text-muted-foreground">{item.description}</p>
                            ) : null}
                          </div>
                        </button>
                        {isExpanded ? (
                          <div className="border-t border-border/60 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4">
                            {item.description ? (
                              <p className="text-sm font-medium text-foreground">{item.description}</p>
                            ) : null}
                            {item.lineItems.length > 0 ? (
                              <ul className="mt-2 space-y-1.5 text-sm text-foreground/85">
                                {item.lineItems.map((line) => (
                                  <li key={line}>{line}</li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
