"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Clock3, Pencil, X } from "lucide-react";
import { DateField } from "@/components/date-field";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TimelineEntry } from "@/lib/console-types";
import { isoDateToLocalDate, todayIsoDate } from "@/lib/date-input";
import { cn } from "@/lib/utils";

type ServiceDraft = {
  shop: string;
  shopLocation: string;
  serviceDate: string;
  mileage: string;
  total: string;
  lineItems: string;
};

type OwnerServiceHistoryTimelineProps = {
  entries: TimelineEntry[];
  disabled?: boolean;
  onUpdateService?: (serviceId: string, patch: Partial<TimelineEntry>) => Promise<void>;
  requireEditConfirmation?: boolean;
};

const entryToDraft = (entry: TimelineEntry): ServiceDraft => ({
  shop: entry.shop,
  shopLocation: entry.shopLocation ?? "",
  serviceDate: entry.serviceDate,
  mileage: String(entry.mileage),
  total: entry.total,
  lineItems: entry.lineItems.join("\n"),
});

const formatShopLine = (entry: TimelineEntry): string => {
  const location = entry.shopLocation?.trim();
  return location ? `${entry.shop} · ${location}` : entry.shop;
};

const formatServiceDate = (iso: string): string => {
  const date = isoDateToLocalDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const groupEntriesByYear = (entries: TimelineEntry[]): [number, TimelineEntry[]][] => {
  const groups = new Map<number, TimelineEntry[]>();
  for (const entry of entries) {
    const year = Number(entry.serviceDate.slice(0, 4)) || 0;
    const bucket = groups.get(year) ?? [];
    bucket.push(entry);
    groups.set(year, bucket);
  }
  return [...groups.entries()].sort(([a], [b]) => b - a);
};

export function OwnerServiceHistoryTimeline({
  entries,
  disabled = false,
  onUpdateService,
  requireEditConfirmation = false,
}: OwnerServiceHistoryTimelineProps) {
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.serviceDate.localeCompare(a.serviceDate)),
    [entries],
  );
  const yearGroups = useMemo(() => groupEntriesByYear(sortedEntries), [sortedEntries]);

  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(() => new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ServiceDraft | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (yearGroups.length === 0) return;
    setExpandedYears((current) => {
      if (current.size > 0) return current;
      return new Set([yearGroups[0][0]]);
    });
  }, [yearGroups]);

  const toggleYear = (year: number) => {
    setExpandedYears((current) => {
      const next = new Set(current);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const toggleCard = (serviceId: string) => {
    if (editingId === serviceId) return;
    setExpandedCards((current) => {
      const next = new Set(current);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  const startEditing = (entry: TimelineEntry) => {
    if (!onUpdateService || disabled) return;
    setEditingId(entry.serviceId);
    setDraft(entryToDraft(entry));
    setConfirmSave(false);
    setExpandedCards((current) => new Set(current).add(entry.serviceId));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraft(null);
    setConfirmSave(false);
  };

  const saveEditing = async (entry: TimelineEntry) => {
    if (!onUpdateService || !draft) return;
    const lineItems = draft.lineItems
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lineItems.length === 0) return;

    setIsSaving(true);
    try {
      await onUpdateService(entry.serviceId, {
        shop: draft.shop.trim() || entry.shop,
        shopLocation: draft.shopLocation.trim() || undefined,
        serviceDate: draft.serviceDate.trim() || entry.serviceDate,
        mileage: Number(draft.mileage) || entry.mileage,
        lineItems,
        total: draft.total.trim() || entry.total,
      });
      cancelEditing();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClick = (entry: TimelineEntry) => {
    if (requireEditConfirmation && !confirmSave) {
      setConfirmSave(true);
      return;
    }
    void saveEditing(entry);
  };

  if (entries.length === 0) {
    return <EmptyState icon={Clock3} title="No service yet" />;
  }

  const renderEditForm = (entry: TimelineEntry) => {
    if (!draft) return null;

    return (
      <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
        <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`edit-shop-${entry.serviceId}`} className="text-xs text-muted-foreground">
              Shop
            </Label>
            <Input
              id={`edit-shop-${entry.serviceId}`}
              value={draft.shop}
              disabled={isSaving}
              onChange={(event) => setDraft({ ...draft, shop: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-location-${entry.serviceId}`} className="text-xs text-muted-foreground">
              Location
            </Label>
            <Input
              id={`edit-location-${entry.serviceId}`}
              value={draft.shopLocation}
              disabled={isSaving}
              placeholder="City, ST"
              onChange={(event) => setDraft({ ...draft, shopLocation: event.target.value })}
            />
          </div>
        </div>
        <div className="flex max-w-2xl flex-wrap items-end gap-3">
          <div className="w-[11.5rem] space-y-1.5">
            <Label htmlFor={`edit-date-${entry.serviceId}`} className="text-xs text-muted-foreground">
              Date
            </Label>
            <DateField
              id={`edit-date-${entry.serviceId}`}
              value={draft.serviceDate}
              max={todayIsoDate()}
              disabled={isSaving}
              onChange={(serviceDate) => setDraft({ ...draft, serviceDate })}
            />
          </div>
          <div className="w-[8.5rem] space-y-1.5">
            <Label htmlFor={`edit-mileage-${entry.serviceId}`} className="text-xs text-muted-foreground">
              Mileage
            </Label>
            <Input
              id={`edit-mileage-${entry.serviceId}`}
              type="number"
              className="tabular-nums"
              value={draft.mileage}
              disabled={isSaving}
              onChange={(event) => setDraft({ ...draft, mileage: event.target.value })}
            />
          </div>
          <div className="w-[7.5rem] space-y-1.5">
            <Label htmlFor={`edit-total-${entry.serviceId}`} className="text-xs text-muted-foreground">
              Total
            </Label>
            <Input
              id={`edit-total-${entry.serviceId}`}
              value={draft.total}
              disabled={isSaving}
              onChange={(event) => setDraft({ ...draft, total: event.target.value })}
            />
          </div>
        </div>
        <div className="max-w-2xl space-y-1.5">
          <Label htmlFor={`edit-lines-${entry.serviceId}`} className="text-xs text-muted-foreground">
            Line items
          </Label>
          <Textarea
            id={`edit-lines-${entry.serviceId}`}
            rows={Math.min(6, Math.max(3, draft.lineItems.split("\n").length))}
            value={draft.lineItems}
            disabled={isSaving}
            onChange={(event) => setDraft({ ...draft, lineItems: event.target.value })}
          />
        </div>
        {requireEditConfirmation && confirmSave ? (
          <p className="max-w-2xl rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-foreground">
            Tap save again to confirm these changes.
          </p>
        ) : null}
      </div>
    );
  };

  const renderCardActions = (entry: TimelineEntry, isEditing: boolean) => {
    if (!onUpdateService) return null;

    if (isEditing) {
      return (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
            disabled={isSaving}
            aria-label={requireEditConfirmation && !confirmSave ? "Review save" : "Save changes"}
            onClick={() => handleSaveClick(entry)}
          >
            <Check className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={isSaving}
            aria-label="Cancel editing"
            onClick={cancelEditing}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      );
    }

    return (
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0 text-slate-400 hover:bg-slate-500/10 hover:text-slate-600 dark:hover:text-slate-300"
        disabled={disabled}
        aria-label="Edit service record"
        onClick={() => startEditing(entry)}
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
      </Button>
    );
  };

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute bottom-0 left-[0.4375rem] top-2 w-px bg-gradient-to-b from-primary/35 via-primary/15 to-transparent" />

      {yearGroups.map(([year, yearEntries]) => {
        const isYearOpen = expandedYears.has(year);

        return (
          <section key={year} className="relative">
            <button
              type="button"
              className="group flex w-full items-center gap-2 rounded-lg py-1 pl-6 pr-2 text-left transition-colors hover:bg-muted/40"
              aria-expanded={isYearOpen}
              onClick={() => toggleYear(year)}
            >
              <span
                className="absolute left-0 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
                aria-hidden
              />
              {isYearOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-primary/70" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="text-base font-semibold tracking-tight text-slate-700 dark:text-slate-200">{year}</span>
              <span className="text-sm text-muted-foreground">
                {yearEntries.length} visit{yearEntries.length === 1 ? "" : "s"}
              </span>
            </button>

            {isYearOpen ? (
              <ul className="mt-2 space-y-2.5 border-l border-primary/15 pl-6">
                {yearEntries.map((entry) => {
                  const isEditing = editingId === entry.serviceId;
                  const isExpanded = isEditing || expandedCards.has(entry.serviceId);
                  const serviceCount = entry.lineItems.length;
                  const previewItem = entry.lineItems[0];

                  return (
                    <li
                      key={entry.serviceId}
                      className={cn(
                        "rounded-xl border bg-card/90 p-3.5 shadow-sm transition-shadow sm:p-4",
                        isEditing
                          ? "border-primary/25 shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.25)]"
                          : "border-border/70 hover:border-primary/20 hover:shadow-md",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">
                            {formatServiceDate(entry.serviceDate)}
                          </p>
                          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            {formatShopLine(entry)} · {entry.mileage.toLocaleString()} mi
                          </p>
                        </div>
                        {renderCardActions(entry, isEditing)}
                      </div>

                      {!isEditing ? (
                        <>
                          {!isExpanded ? (
                            <button
                              type="button"
                              className="mt-2.5 flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                              onClick={() => toggleCard(entry.serviceId)}
                            >
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-primary/60" aria-hidden />
                              <span className="truncate">
                                {serviceCount === 1
                                  ? previewItem
                                  : `${previewItem}${serviceCount > 1 ? ` · +${serviceCount - 1} more` : ""}`}
                              </span>
                            </button>
                          ) : (
                            <div className="mt-3 border-t border-border/60 pt-3">
                              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                                Services performed
                              </p>
                              <ul className="mt-2 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                                {entry.lineItems.map((item) => (
                                  <li key={item} className="leading-snug">
                                    {item}
                                  </li>
                                ))}
                              </ul>
                              {entry.total && entry.total !== "$0.00" ? (
                                <p className="mt-2 text-sm font-medium text-slate-500">Total · {entry.total}</p>
                              ) : null}
                              <button
                                type="button"
                                className="mt-2 text-xs font-medium text-primary/80 hover:text-primary"
                                onClick={() => toggleCard(entry.serviceId)}
                              >
                                Show less
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        renderEditForm(entry)
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
