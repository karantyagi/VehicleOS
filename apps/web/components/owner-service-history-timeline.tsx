"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock3,
  FileJson,
  GitMerge,
  GripVertical,
  Mic,
  PenLine,
  Pencil,
  Plus,
  Receipt,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import {
  findPossibleServiceDuplicates,
  type PossibleServiceDuplicate,
} from "@vehicleos/domain";
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
  defaultMileage?: number;
  onUpdateService?: (serviceId: string, patch: Partial<TimelineEntry>) => Promise<void>;
  onMergeService?: (
    targetServiceId: string,
    mergedServiceId: string,
    lineItems: string[],
  ) => Promise<void>;
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

const lineItemKey = (lineItem: string): string =>
  lineItem.trim().toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");

const uniqueLineItems = (entries: TimelineEntry[]): string[] => {
  const seen = new Set<string>();
  return entries.flatMap((entry) =>
    entry.lineItems.filter((lineItem) => {
      const key = lineItemKey(lineItem);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  );
};

const isEvidenceBackedSource = (entry: TimelineEntry): boolean =>
  entry.source === "dealer" ||
  entry.source === "receipt" ||
  entry.source === "carfax_import";

export function OwnerServiceHistoryTimeline({
  entries,
  disabled = false,
  defaultMileage = 0,
  onUpdateService,
  onMergeService,
  onAddService,
  requireEditConfirmation = false,
}: OwnerServiceHistoryTimelineProps) {
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.serviceDate.localeCompare(a.serviceDate)),
    [entries],
  );
  const yearGroups = useMemo(() => groupEntriesByYear(sortedEntries), [sortedEntries]);
  const latestEntry = sortedEntries[0] ?? null;
  const totalCost = useMemo(() => sumEntryCosts(entries), [entries]);
  const possibleDuplicates = useMemo(
    () => findPossibleServiceDuplicates(entries),
    [entries],
  );
  const duplicateByServiceId = useMemo(() => {
    const byServiceId = new Map<string, PossibleServiceDuplicate>();
    for (const candidate of possibleDuplicates) {
      if (!byServiceId.has(candidate.firstServiceId)) {
        byServiceId.set(candidate.firstServiceId, candidate);
      }
      if (!byServiceId.has(candidate.secondServiceId)) {
        byServiceId.set(candidate.secondServiceId, candidate);
      }
    }
    return byServiceId;
  }, [possibleDuplicates]);

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
  const [mergeReview, setMergeReview] = useState<{
    candidate: PossibleServiceDuplicate;
    anchorServiceId: string;
    targetServiceId: string;
    lineItems: string[];
  } | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [draggedMergeItemIndex, setDraggedMergeItemIndex] = useState<number | null>(null);
  const [isAddingMergeItem, setIsAddingMergeItem] = useState(false);
  const [mergeItemDraft, setMergeItemDraft] = useState("");

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

  const duplicateAnchorServiceId = (candidate: PossibleServiceDuplicate): string => {
    const first = entries.find((entry) => entry.serviceId === candidate.firstServiceId);
    const second = entries.find((entry) => entry.serviceId === candidate.secondServiceId);
    if (!first || !second) return candidate.firstServiceId;
    return first.serviceDate >= second.serviceDate ? first.serviceId : second.serviceId;
  };

  const startMergeReview = (candidate: PossibleServiceDuplicate) => {
    if (!onMergeService || disabled) return;
    const first = entries.find((entry) => entry.serviceId === candidate.firstServiceId);
    const second = entries.find((entry) => entry.serviceId === candidate.secondServiceId);
    if (!first || !second) return;
    const preferred =
      isEvidenceBackedSource(first) !== isEvidenceBackedSource(second)
        ? isEvidenceBackedSource(first)
          ? first
          : second
        : first.serviceDate <= second.serviceDate
          ? first
          : second;

    cancelEditing();
    setMergeReview({
      candidate,
      anchorServiceId: duplicateAnchorServiceId(candidate),
      targetServiceId: preferred.serviceId,
      lineItems: uniqueLineItems([preferred, preferred === first ? second : first]),
    });
    setIsAddingMergeItem(false);
    setMergeItemDraft("");
    setExpandedCards((current) =>
      new Set(current).add(candidate.firstServiceId).add(candidate.secondServiceId),
    );
  };

  const confirmMerge = async () => {
    if (!onMergeService || !mergeReview || mergeReview.lineItems.length === 0) return;
    const { candidate, targetServiceId, lineItems } = mergeReview;
    const mergedServiceId =
      candidate.firstServiceId === targetServiceId
        ? candidate.secondServiceId
        : candidate.firstServiceId;

    setIsMerging(true);
    try {
      await onMergeService(targetServiceId, mergedServiceId, lineItems);
      setMergeReview(null);
    } finally {
      setIsMerging(false);
    }
  };

  const moveMergeLineItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setMergeReview((current) => {
      if (!current) return current;
      const lineItems = [...current.lineItems];
      const [moved] = lineItems.splice(fromIndex, 1);
      if (!moved) return current;
      lineItems.splice(toIndex, 0, moved);
      return { ...current, lineItems };
    });
  };

  const removeMergeLineItem = (index: number) => {
    setMergeReview((current) => {
      if (!current || current.lineItems.length === 1) return current;
      return {
        ...current,
        lineItems: current.lineItems.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  const addMergeLineItem = () => {
    const lineItem = mergeItemDraft.trim();
    if (!lineItem) return;
    setMergeReview((current) => {
      if (!current || current.lineItems.some((item) => lineItemKey(item) === lineItemKey(lineItem))) {
        return current;
      }
      return { ...current, lineItems: [...current.lineItems, lineItem] };
    });
    setMergeItemDraft("");
    setIsAddingMergeItem(false);
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
            <p className="mt-0.5 text-sm text-muted-foreground">Dealer visit, DIY work, or anything you want on file.</p>
            <div className="mt-3">
              <MaintenanceRecordFields
                idPrefix="add-maintenance"
                draft={addDraft}
                disabled={disabled}
                isSaving={isAddingSaving}
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

  if (entries.length === 0 && !isAdding) {
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

  const renderSourceGlyph = (entry: TimelineEntry) => {
    const Icon = sourceIcon(entry);
    return (
      <span
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-history-highlight/10 text-history-highlight"
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>
    );
  };

  const renderMergeReview = (review: NonNullable<typeof mergeReview>) => {
    const { candidate } = review;
    const first = entries.find((entry) => entry.serviceId === candidate.firstServiceId);
    const second = entries.find((entry) => entry.serviceId === candidate.secondServiceId);
    if (!first || !second) return null;

    const sourceLabel = (entry: TimelineEntry) => {
      if (entry.source === "carfax_import") return "CARFAX";
      if (entry.source === "owner_note") return "Owner entry";
      if (entry.source === "receipt") return "Receipt";
      if (entry.source === "voice") return "Voice";
      return "Dealer";
    };

    const renderSourceChoice = (entry: TimelineEntry) => {
      const isSelected = review.targetServiceId === entry.serviceId;
      return (
        <button
          type="button"
          className={cn(
            "relative rounded-lg border px-3 py-2.5 text-left transition-colors",
            isSelected
              ? "border-history-highlight bg-history-highlight/10"
              : "border-border bg-background hover:border-history-highlight/40",
          )}
          disabled={isMerging}
          aria-pressed={isSelected}
          onClick={() =>
            setMergeReview((current) =>
              current ? { ...current, targetServiceId: entry.serviceId } : current,
            )
          }
        >
          <span className="block pr-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {sourceLabel(entry)}
          </span>
          <span className="mt-1 block text-sm font-semibold text-foreground">
            {formatServiceDate(entry.serviceDate)}
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground">
            {formatShopLine(entry)}
          </span>
          {isSelected ? (
            <span className="absolute right-2.5 top-2.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-history-highlight text-white">
              <Check className="h-3 w-3" aria-hidden />
            </span>
          ) : null}
        </button>
      );
    };

    return (
      <div className="border-t border-history-highlight/25 bg-history-highlight/[0.04] px-3.5 py-4 sm:px-4">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-history-highlight" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Assistant prepared one clean record</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Same {first.mileage.toLocaleString()} mi · {candidate.dayDistance === 0 ? "same day" : "one day apart"} ·
              matching “{candidate.matchingLineItems[0]}”
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Use date and shop from
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {renderSourceChoice(first)}
            {renderSourceChoice(second)}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Work performed · {review.lineItems.length}
            </p>
            <span className="text-xs text-muted-foreground">Drag or tap arrows</span>
          </div>
          <ul className="space-y-1.5">
            {review.lineItems.map((lineItem, index) => (
              <li
                key={`${lineItemKey(lineItem)}-${index}`}
                draggable={!isMerging}
                className={cn(
                  "flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-2 text-sm",
                  draggedMergeItemIndex === index && "opacity-50",
                )}
                onDragStart={() => setDraggedMergeItemIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedMergeItemIndex !== null) {
                    moveMergeLineItem(draggedMergeItemIndex, index);
                  }
                  setDraggedMergeItemIndex(null);
                }}
                onDragEnd={() => setDraggedMergeItemIndex(null)}
              >
                <GripVertical
                  className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 text-foreground">{lineItem}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-muted-foreground"
                  disabled={isMerging || index === 0}
                  aria-label={`Move ${lineItem} up`}
                  onClick={() => moveMergeLineItem(index, index - 1)}
                >
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-muted-foreground"
                  disabled={isMerging || index === review.lineItems.length - 1}
                  aria-label={`Move ${lineItem} down`}
                  onClick={() => moveMergeLineItem(index, index + 1)}
                >
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  disabled={isMerging || review.lineItems.length === 1}
                  aria-label={`Remove ${lineItem}`}
                  onClick={() => removeMergeLineItem(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>

          {isAddingMergeItem ? (
            <div className="mt-2 flex gap-2">
              <Input
                autoFocus
                value={mergeItemDraft}
                placeholder="Add missing work"
                disabled={isMerging}
                onChange={(event) => setMergeItemDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addMergeLineItem();
                  }
                  if (event.key === "Escape") {
                    setIsAddingMergeItem(false);
                    setMergeItemDraft("");
                  }
                }}
              />
              <Button type="button" size="sm" disabled={!mergeItemDraft.trim()} onClick={addMergeLineItem}>
                Add
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-1.5 px-2 text-muted-foreground"
              disabled={isMerging}
              onClick={() => setIsAddingMergeItem(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Add missing item
            </Button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <Button type="button" size="sm" disabled={isMerging} onClick={() => void confirmMerge()}>
            <GitMerge className="mr-1.5 h-4 w-4" aria-hidden />
            {isMerging ? "Merging…" : "Merge 2 records"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isMerging}
            onClick={() => {
              setMergeReview(null);
              setIsAddingMergeItem(false);
              setMergeItemDraft("");
            }}
          >
            Cancel
          </Button>
          <span className="text-xs text-muted-foreground">
            Evidence combines automatically. You can edit details later.
          </span>
        </div>
      </div>
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

      {isAdding && entries.length === 0 ? (
        <ul className="history-accent-rail space-y-2.5">{renderAddPanel()}</ul>
      ) : null}

      {latestEntry ? (
        <section className="history-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-history-highlight">
                Latest maintenance
              </p>
              <div className="mt-2 flex items-start gap-3">
                {renderSourceGlyph(latestEntry)}
                <div className="min-w-0">
                  <p className="text-lg font-semibold tracking-tight text-foreground">
                    {formatServiceDate(latestEntry.serviceDate)}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{formatShopLine(latestEntry)}</p>
                  <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                    {latestEntry.mileage.toLocaleString()} mi · {formatCostDisplay(latestEntry.total)}
                  </p>
                </div>
              </div>
            </div>
            <dl className="flex shrink-0 gap-5 text-sm tabular-nums">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Records</dt>
                <dd className="mt-0.5 font-semibold text-foreground">{entries.length}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</dt>
                <dd className="mt-0.5 font-semibold text-foreground">{totalCost}</dd>
              </div>
            </dl>
          </div>
        </section>
      ) : null}

      <div className="relative space-y-6">
        <div className="pointer-events-none absolute bottom-0 left-[0.4375rem] top-2 w-px bg-gradient-to-b from-history-highlight/35 via-history-highlight/12 to-transparent" />

        {isAdding && entries.length > 0 ? (
          <ul className="history-accent-rail relative space-y-2.5 pl-6">{renderAddPanel()}</ul>
        ) : null}

        {yearGroups.map(([year, yearEntries]) => {
          const isYearOpen = expandedYears.has(year);
          const yearCost = sumEntryCosts(yearEntries);

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
                  {yearEntries.length} record{yearEntries.length === 1 ? "" : "s"} · {yearCost}
                </span>
              </button>

              {isYearOpen ? (
                <ul className="history-accent-rail mt-2 space-y-2.5">
                  {yearEntries.map((entry) => {
                    const isEditing = editingId === entry.serviceId;
                    const isExpanded = isEditing || expandedCards.has(entry.serviceId);
                    const serviceCount = entry.lineItems.length;
                    const previewItem = entry.lineItems[0];
                    const costDisplay = formatCostDisplay(entry.total);
                    const duplicateCandidate = duplicateByServiceId.get(entry.serviceId);
                    const showDuplicateFlag =
                      duplicateCandidate !== undefined &&
                      duplicateAnchorServiceId(duplicateCandidate) === entry.serviceId;

                    return (
                      <li
                        key={entry.serviceId}
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
                              onClick={() => toggleCard(entry.serviceId)}
                            >
                              {renderSourceGlyph(entry)}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-lg font-semibold tracking-tight text-foreground">
                                    {formatServiceDate(entry.serviceDate)}
                                  </p>
                                  {isExpanded ? (
                                    <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-history-highlight" aria-hidden />
                                  ) : (
                                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-history-highlight/70" aria-hidden />
                                  )}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">{formatShopLine(entry)}</p>
                                <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
                                  {entry.mileage.toLocaleString()} mi · {costDisplay}
                                </p>
                                {!isExpanded ? (
                                  <p className="mt-2 truncate text-sm text-muted-foreground">
                                    {serviceCount === 1
                                      ? previewItem
                                      : `${previewItem}${serviceCount > 1 ? ` · +${serviceCount - 1}` : ""}`}
                                  </p>
                                ) : null}
                              </div>
                            </button>
                          ) : (
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              {renderSourceGlyph(entry)}
                              <div className="min-w-0 flex-1">
                                <p className="text-lg font-semibold tracking-tight text-foreground">
                                  {formatServiceDate(entry.serviceDate)}
                                </p>
                                <p className="mt-0.5 text-sm text-muted-foreground">{formatShopLine(entry)}</p>
                              </div>
                            </div>
                          )}

                          {!isEditing ? (
                            <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                              {duplicateCandidate && showDuplicateFlag && onMergeService ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 border-amber-500/30 bg-amber-500/5 px-2.5 text-amber-700 hover:bg-amber-500/10"
                                  disabled={disabled}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    startMergeReview(duplicateCandidate);
                                  }}
                                >
                                  <AlertTriangle className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                                  Possible duplicate
                                </Button>
                              ) : null}
                              {onUpdateService ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2.5 text-muted-foreground hover:bg-history-highlight/10 hover:text-history-highlight"
                                  disabled={disabled}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    startEditing(entry);
                                  }}
                                >
                                  <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                                  Edit
                                </Button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        {!isEditing && isExpanded ? (
                          <div className="border-t border-border/60 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4">
                            <ul className="space-y-1.5 text-sm text-foreground/85">
                              {entry.lineItems.map((item) => (
                                <li key={item} className="leading-snug">
                                  {item}
                                </li>
                              ))}
                            </ul>
                            <p className="mt-3 text-sm tabular-nums font-medium text-muted-foreground">
                              {costDisplay}
                            </p>
                          </div>
                        ) : null}

                        {isEditing ? renderEditForm(entry) : null}
                        {mergeReview?.anchorServiceId === entry.serviceId
                          ? renderMergeReview(mergeReview)
                          : null}
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
