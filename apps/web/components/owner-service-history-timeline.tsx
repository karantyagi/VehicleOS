"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  Building2,
  Check,
  ChevronRight,
  ChevronUp,
  Clock3,
  FileBadge2,
  FileJson,
  Mic,
  PenLine,
  Pencil,
  Plus,
  Receipt,
  Wrench,
  X,
} from "lucide-react";
import { DateField } from "@/components/date-field";
import { EmptyState } from "@/components/empty-state";
import {
  draftLineItems,
  emptyMaintenanceRecordDraft,
  MaintenanceRecordFields,
  type MaintenanceRecordDraft,
} from "@/components/maintenance-record-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { OwnershipRecordEntry, TimelineEntry } from "@/lib/console-types";
import { RMV_EVENT_LABELS } from "@/lib/record-import-types";
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
  ownershipRecords?: OwnershipRecordEntry[];
  disabled?: boolean;
  defaultMileage?: number;
  vehicleId?: string;
  apiBase?: string;
  onCaptureError?: (message: string) => void;
  onUpdateService?: (serviceId: string, patch: Partial<TimelineEntry>) => Promise<void>;
  onAddService?: (draft: MaintenanceRecordDraft) => Promise<void>;
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

const parseTotalDollars = (total: string | undefined): number | null => {
  if (!total?.trim()) return null;
  const match = total.match(/\$?\s*([\d,]+(?:\.\d{2})?)/);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
};

const formatCostDisplay = (total: string | undefined): string => {
  const dollars = parseTotalDollars(total);
  if (dollars === null || dollars <= 0) return "$—";
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const sumEntryCosts = (entries: TimelineEntry[]): string => {
  let sum = 0;
  let hasCost = false;
  for (const entry of entries) {
    const dollars = parseTotalDollars(entry.total);
    if (dollars !== null && dollars > 0) {
      sum += dollars;
      hasCost = true;
    }
  }
  if (!hasCost) return "$—";
  return `$${sum.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const isDiyShop = (shop: string): boolean => {
  const normalized = shop.trim().toLowerCase();
  return normalized.includes("self") || normalized.includes("diy");
};

const sourceIcon = (entry: TimelineEntry): ElementType => {
  if (isDiyShop(entry.shop)) return Wrench;
  if (entry.source === "receipt") return Receipt;
  if (entry.source === "voice") return Mic;
  if (entry.source === "owner_note") return PenLine;
  if (entry.source === "dealer") return Building2;
  return FileJson;
};

type HistoryCardKind = "service" | "ownership";

type HistoryCard = {
  id: string;
  kind: HistoryCardKind;
  date: string;
  mileage: number | null;
  title: string;
  subtitle: string;
  preview: string;
  lineItems: string[];
  costDisplay: string;
  serviceEntry?: TimelineEntry;
  ownershipEntry?: OwnershipRecordEntry;
};

const ownershipSourceLabel = (source: OwnershipRecordEntry["source"]): string => {
  if (source === "rmv_import") return "RMV import";
  if (source === "owner_note") return "Owner noted";
  return "CARFAX";
};

const buildHistoryCards = (
  entries: TimelineEntry[],
  ownershipRecords: OwnershipRecordEntry[],
): HistoryCard[] => {
  const serviceCards: HistoryCard[] = entries.map((entry) => ({
    id: entry.serviceId,
    kind: "service",
    date: entry.serviceDate,
    mileage: entry.mileage,
    title: formatServiceDate(entry.serviceDate),
    subtitle: formatShopLine(entry),
    preview:
      entry.lineItems.length === 1
        ? entry.lineItems[0]
        : `${entry.lineItems[0]} · +${entry.lineItems.length - 1}`,
    lineItems: entry.lineItems,
    costDisplay: formatCostDisplay(entry.total),
    serviceEntry: entry,
  }));

  const ownershipCards: HistoryCard[] = ownershipRecords.map((record) => {
    const lineItems = [record.description, ...record.details].filter(Boolean);
    return {
      id: record.recordId,
      kind: "ownership",
      date: record.recordDate,
      mileage: record.mileage,
      title: formatServiceDate(record.recordDate),
      subtitle: `${record.agency} · ${RMV_EVENT_LABELS[record.eventType]}`,
      preview: lineItems[0] ?? RMV_EVENT_LABELS[record.eventType],
      lineItems,
      costDisplay: "$—",
      ownershipEntry: record,
    };
  });

  return [...serviceCards, ...ownershipCards].sort((a, b) => b.date.localeCompare(a.date));
};

const groupCardsByYear = (cards: HistoryCard[]): [number, HistoryCard[]][] => {
  const groups = new Map<number, HistoryCard[]>();
  for (const card of cards) {
    const year = Number(card.date.slice(0, 4)) || 0;
    const bucket = groups.get(year) ?? [];
    bucket.push(card);
    groups.set(year, bucket);
  }
  return [...groups.entries()].sort(([a], [b]) => b - a);
};

const cardIcon = (card: HistoryCard): ElementType => {
  if (card.kind === "ownership") return FileBadge2;
  const entry = card.serviceEntry;
  if (!entry) return FileJson;
  if (isDiyShop(entry.shop)) return Wrench;
  if (entry.source === "receipt") return Receipt;
  if (entry.source === "voice") return Mic;
  if (entry.source === "owner_note") return PenLine;
  if (entry.source === "dealer") return Building2;
  return FileJson;
};

const sumServiceCosts = (entries: TimelineEntry[]): string => sumEntryCosts(entries);

export function OwnerServiceHistoryTimeline({
  entries,
  ownershipRecords = [],
  disabled = false,
  defaultMileage = 0,
  vehicleId,
  apiBase,
  onCaptureError,
  onUpdateService,
  onAddService,
  requireEditConfirmation = false,
}: OwnerServiceHistoryTimelineProps) {
  const historyCards = useMemo(
    () => buildHistoryCards(entries, ownershipRecords),
    [entries, ownershipRecords],
  );
  const yearGroups = useMemo(() => groupCardsByYear(historyCards), [historyCards]);
  const latestCard = historyCards[0] ?? null;
  const totalCost = useMemo(() => sumServiceCosts(entries), [entries]);

  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(() => new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ServiceDraft | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<MaintenanceRecordDraft | null>(null);
  const [confirmAdd, setConfirmAdd] = useState(false);
  const [isAddingSaving, setIsAddingSaving] = useState(false);

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

  const startAdding = () => {
    if (!onAddService || disabled) return;
    cancelEditing();
    setIsAdding(true);
    setAddDraft(emptyMaintenanceRecordDraft(defaultMileage));
    setConfirmAdd(false);
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setAddDraft(null);
    setConfirmAdd(false);
  };

  const saveAdding = async () => {
    if (!onAddService || !addDraft) return;
    if (draftLineItems(addDraft).length === 0) return;

    setIsAddingSaving(true);
    try {
      await onAddService(addDraft);
      cancelAdding();
    } finally {
      setIsAddingSaving(false);
    }
  };

  const handleAddClick = () => {
    if (requireEditConfirmation && !confirmAdd) {
      setConfirmAdd(true);
      return;
    }
    void saveAdding();
  };

  const renderAddPanel = () => {
    if (!isAdding || !addDraft) return null;

    return (
      <li className="overflow-hidden rounded-xl border history-interactive-active bg-card/90 shadow-sm">
        <div className="flex items-start gap-3 p-3.5 sm:p-4">
          <span
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-history-highlight/10 text-history-highlight"
            aria-hidden
          >
            <Plus className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold tracking-tight text-foreground">Add maintenance record</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Dealer visit, DIY, RMV event, habit (Techron), or a decision you want on file.
            </p>
            <div className="mt-3">
              <MaintenanceRecordFields
                idPrefix="add-maintenance"
                draft={addDraft}
                disabled={disabled}
                isSaving={isAddingSaving}
                vehicleId={vehicleId}
                apiBase={apiBase}
                onCaptureError={onCaptureError}
                saveLabel={requireEditConfirmation && !confirmAdd ? "Review save" : "Save record"}
                confirmMessage={
                  requireEditConfirmation && confirmAdd ? "Tap save again to confirm this maintenance record." : null
                }
                onDraftChange={setAddDraft}
                onSave={handleAddClick}
                onCancel={cancelAdding}
              />
            </div>
          </div>
        </div>
      </li>
    );
  };

  if (historyCards.length === 0 && !isAdding) {
    return (
      <div className="space-y-4">
        <EmptyState icon={Clock3} title="No maintenance records yet" />
        {onAddService ? (
          <div className="flex justify-center">
            <Button type="button" size="sm" disabled={disabled} onClick={startAdding}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              Add maintenance record
            </Button>
          </div>
        ) : null}
      </div>
    );
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
        <div className="flex gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-history-highlight hover:bg-history-highlight/10 hover:text-history-highlight"
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
      </div>
    );
  };

  const renderCardGlyph = (card: HistoryCard) => {
    const Icon = cardIcon(card);
    return (
      <span
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          card.kind === "ownership"
            ? "bg-primary/10 text-primary"
            : "bg-history-highlight/10 text-history-highlight",
        )}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {onAddService && !isAdding ? (
          <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={startAdding}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            Add maintenance record
          </Button>
        ) : (
          <span aria-hidden />
        )}
      </div>

      {isAdding && historyCards.length === 0 ? (
        <ul className="history-accent-rail space-y-2.5">{renderAddPanel()}</ul>
      ) : null}

      {latestCard ? (
        <section className="history-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-history-highlight">
                {latestCard.kind === "ownership" ? "Latest on file" : "Latest maintenance"}
              </p>
              <div className="mt-2 flex items-start gap-3">
                {renderCardGlyph(latestCard)}
                <div className="min-w-0">
                  <p className="text-lg font-semibold tracking-tight text-foreground">{latestCard.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{latestCard.subtitle}</p>
                  <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                    {latestCard.mileage !== null ? `${latestCard.mileage.toLocaleString()} mi · ` : ""}
                    {latestCard.costDisplay}
                  </p>
                </div>
              </div>
            </div>
            <dl className="flex shrink-0 gap-5 text-sm tabular-nums">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Records</dt>
                <dd className="mt-0.5 font-semibold text-foreground">{historyCards.length}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Service spend</dt>
                <dd className="mt-0.5 font-semibold text-foreground">{totalCost}</dd>
              </div>
            </dl>
          </div>
        </section>
      ) : null}

      <div className="relative space-y-6">
        <div className="pointer-events-none absolute bottom-0 left-[0.4375rem] top-2 w-px bg-gradient-to-b from-history-highlight/35 via-history-highlight/12 to-transparent" />

        {isAdding && historyCards.length > 0 ? (
          <ul className="history-accent-rail relative space-y-2.5 pl-6">{renderAddPanel()}</ul>
        ) : null}

        {yearGroups.map(([year, yearCards]) => {
          const isYearOpen = expandedYears.has(year);
          const yearServiceEntries = yearCards
            .filter((card) => card.kind === "service" && card.serviceEntry)
            .map((card) => card.serviceEntry as TimelineEntry);
          const yearCost = sumEntryCosts(yearServiceEntries);

          return (
            <section key={year} className="relative">
              <button
                type="button"
                className="group flex w-full items-center gap-2 rounded-lg py-1 pl-6 pr-2 text-left history-interactive"
                aria-expanded={isYearOpen}
                onClick={() => toggleYear(year)}
              >
                <span
                  className="absolute left-0 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-history-highlight shadow-[0_0_0_3px_hsl(var(--history-highlight)/0.18)] transition-shadow group-hover:shadow-[0_0_0_4px_hsl(var(--history-highlight)/0.28)]"
                  aria-hidden
                />
                {isYearOpen ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-history-highlight" aria-hidden />
                ) : (
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-history-highlight"
                    aria-hidden
                  />
                )}
                <span className="text-base font-semibold tracking-tight text-foreground">{year}</span>
                <span className="text-sm tabular-nums text-muted-foreground group-hover:text-history-highlight/85">
                  {yearCards.length} record{yearCards.length === 1 ? "" : "s"}
                  {yearServiceEntries.length > 0 ? ` · ${yearCost}` : ""}
                </span>
              </button>

              {isYearOpen ? (
                <ul className="history-accent-rail mt-2 space-y-2.5">
                  {yearCards.map((card) => {
                    const entry = card.serviceEntry;
                    const isEditing = entry ? editingId === entry.serviceId : false;
                    const isExpanded = isEditing || expandedCards.has(card.id);

                    return (
                      <li
                        key={card.id}
                        className={cn(
                          "overflow-hidden rounded-xl border bg-card/90 shadow-sm",
                          isEditing || isExpanded ? "history-interactive-active" : "border-border/70 history-interactive",
                        )}
                      >
                        <div className="flex items-start gap-2 p-3.5 sm:p-4">
                          {!isEditing ? (
                            <button
                              type="button"
                              className="flex min-w-0 flex-1 items-start gap-3 text-left"
                              aria-expanded={isExpanded}
                              onClick={() => toggleCard(card.id)}
                            >
                              {renderCardGlyph(card)}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-lg font-semibold tracking-tight text-foreground">{card.title}</p>
                                  {isExpanded ? (
                                    <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-history-highlight" aria-hidden />
                                  ) : (
                                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-history-highlight/70" aria-hidden />
                                  )}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">{card.subtitle}</p>
                                <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
                                  {card.mileage !== null ? `${card.mileage.toLocaleString()} mi · ` : ""}
                                  {card.costDisplay}
                                </p>
                                {!isExpanded ? (
                                  <p className="mt-2 truncate text-sm text-muted-foreground">{card.preview}</p>
                                ) : null}
                              </div>
                            </button>
                          ) : entry ? (
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              {renderCardGlyph(card)}
                              <div className="min-w-0 flex-1">
                                <p className="text-lg font-semibold tracking-tight text-foreground">{card.title}</p>
                                <p className="mt-0.5 text-sm text-muted-foreground">{card.subtitle}</p>
                              </div>
                            </div>
                          ) : null}

                          {onUpdateService && entry && !isEditing ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-history-highlight/10 hover:text-history-highlight"
                              disabled={disabled}
                              aria-label="Edit maintenance record"
                              onClick={(event) => {
                                event.stopPropagation();
                                startEditing(entry);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                          ) : null}
                        </div>

                        {!isEditing && isExpanded ? (
                          <div className="border-t border-border/60 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4">
                            {card.kind === "ownership" && card.ownershipEntry ? (
                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {ownershipSourceLabel(card.ownershipEntry.source)}
                              </p>
                            ) : null}
                            <ul className="mt-1.5 space-y-1.5 text-sm text-foreground/85">
                              {card.lineItems.map((item) => (
                                <li key={item} className="leading-snug">
                                  {item}
                                </li>
                              ))}
                            </ul>
                            {card.kind === "service" ? (
                              <p className="mt-3 text-sm tabular-nums font-medium text-muted-foreground">
                                {card.costDisplay}
                              </p>
                            ) : null}
                          </div>
                        ) : null}

                        {isEditing && entry ? renderEditForm(entry) : null}
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
