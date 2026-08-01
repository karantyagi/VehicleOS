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
  FileBadge2,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { OwnerHistoryItem, QueueItem, TimelineEntry } from "@/lib/console-types";
import { isoDateToLocalDate, todayIsoDate } from "@/lib/date-input";
import {
  filterOwnerHistoryItems,
  OWNER_HISTORY_FILTERS,
  type OwnerHistoryFilter,
} from "@/lib/owner-history-filter";
import { RMV_EVENT_LABELS } from "@/lib/record-import-types";
import { cn } from "@/lib/utils";

type OwnerUnifiedHistoryTimelineProps = {
  items: OwnerHistoryItem[];
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
  onGoToImport?: () => void;
  addRequestKey?: number;
  addRequestTaskId?: string | null;
  addRequestLineItem?: string | null;
  onAddRequestHandled?: () => void;
  focusedRecordId?: string | null;
  verifications?: QueueItem[];
  onReviewVerification?: (taskId: string) => void;
};

type ServiceDraft = {
  shop: string;
  shopLocation: string;
  serviceDate: string;
  mileage: string;
  total: string;
  lineItems: string;
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

const entryToDraft = (entry: TimelineEntry): ServiceDraft => ({
  shop: entry.shop,
  shopLocation: entry.shopLocation ?? "",
  serviceDate: entry.serviceDate,
  mileage: String(entry.mileage),
  total: entry.total,
  lineItems: entry.lineItems.join("\n"),
});

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

const formatShopLine = (entry: TimelineEntry): string => {
  const location = entry.shopLocation?.trim();
  return location ? `${entry.shop} · ${location}` : entry.shop;
};

const resolutionLabel = (item: QueueItem): string => {
  if (item.resolution === "approve" || item.status === "approved") return "Confirmed";
  if (item.resolution === "dismiss" || item.status === "dismissed") return "Kept existing";
  if (item.resolution === "complete" || item.status === "completed") return "Completed";
  if (item.resolution === "schedule" || item.status === "scheduled") return "Scheduled";
  return "Resolved";
};

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
  onMergeService,
  onAddService,
  requireEditConfirmation = false,
  onGoToImport,
  addRequestKey = 0,
  addRequestTaskId = null,
  addRequestLineItem = null,
  onAddRequestHandled,
  focusedRecordId = null,
  verifications = [],
  onReviewVerification,
}: OwnerUnifiedHistoryTimelineProps) {
  const [historyFilter, setHistoryFilter] = useState<OwnerHistoryFilter>("all");
  const filteredItems = useMemo(
    () => filterOwnerHistoryItems(items, historyFilter),
    [historyFilter, items],
  );
  const yearGroups = useMemo(() => groupByYear(filteredItems), [filteredItems]);
  const serviceItems = useMemo(() => items.filter((item) => item.kind === "service"), [items]);
  const historyFilterCounts = useMemo(
    () => ({
      all: items.length,
      service: serviceItems.length,
      ownership: items.length - serviceItems.length,
    }),
    [items.length, serviceItems.length],
  );
  const serviceEntries = useMemo(() => serviceItems.map(serviceEntryFromItem), [serviceItems]);
  const possibleDuplicates = useMemo(
    () => findPossibleServiceDuplicates(serviceEntries),
    [serviceEntries],
  );
  const duplicateByServiceId = useMemo(() => {
    const byServiceId = new Map<string, PossibleServiceDuplicate>();
    for (const candidate of possibleDuplicates) {
      if (!byServiceId.has(candidate.firstServiceId)) byServiceId.set(candidate.firstServiceId, candidate);
      if (!byServiceId.has(candidate.secondServiceId)) byServiceId.set(candidate.secondServiceId, candidate);
    }
    return byServiceId;
  }, [possibleDuplicates]);
  const pendingVerificationByRecordId = useMemo(() => {
    const byRecordId = new Map<string, QueueItem>();
    for (const item of verifications) {
      if (item.status === "pending" && item.target?.surface === "history" && item.target.recordId) {
        byRecordId.set(item.target.recordId, item);
      }
    }
    return byRecordId;
  }, [verifications]);
  const resolvedVerifications = useMemo(
    () =>
      verifications
        .filter((item) => item.status !== "pending" && (item.resolvedAt || item.resolution))
        .sort((a, b) => (b.resolvedAt ?? "").localeCompare(a.resolvedAt ?? "")),
    [verifications],
  );
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
    const filteredYears = new Set(yearGroups.map(([year]) => year));
    setExpandedYears((current) =>
      [...current].some((year) => filteredYears.has(year)) ? current : new Set([yearGroups[0][0]]),
    );
  }, [yearGroups]);

  useEffect(() => {
    if (!focusedRecordId) return;
    setHistoryFilter("all");
    const item = items.find((candidate) => candidate.id === focusedRecordId);
    if (!item) return;
    const year = Number(item.date.slice(0, 4)) || 0;
    setExpandedYears((current) => new Set(current).add(year));
    setExpandedCards((current) => new Set(current).add(focusedRecordId));
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(`history-record-${focusedRecordId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusedRecordId, items]);

  const toggleYear = (year: number) => {
    setExpandedYears((current) => {
      const next = new Set(current);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const toggleCard = (id: string) => {
    if (editingId === id) return;
    setExpandedCards((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraft(null);
    setConfirmSave(false);
  };

  const startEditing = (entry: TimelineEntry) => {
    if (!onUpdateService || disabled) return;
    setEditingId(entry.serviceId);
    setDraft(entryToDraft(entry));
    setConfirmSave(false);
    setExpandedCards((current) => new Set(current).add(entry.serviceId));
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

  const duplicateAnchorServiceId = (candidate: PossibleServiceDuplicate): string => {
    const first = serviceEntries.find((entry) => entry.serviceId === candidate.firstServiceId);
    const second = serviceEntries.find((entry) => entry.serviceId === candidate.secondServiceId);
    if (!first || !second) return candidate.firstServiceId;
    return first.serviceDate >= second.serviceDate ? first.serviceId : second.serviceId;
  };

  const startMergeReview = (candidate: PossibleServiceDuplicate) => {
    if (!onMergeService || disabled) return;
    const first = serviceEntries.find((entry) => entry.serviceId === candidate.firstServiceId);
    const second = serviceEntries.find((entry) => entry.serviceId === candidate.secondServiceId);
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
      return { ...current, lineItems: current.lineItems.filter((_, itemIndex) => itemIndex !== index) };
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

  const startAdding = (
    attentionTaskId?: string | null,
    requestedLineItem?: string | null,
  ) => {
    if (!onAddService || disabled) return;
    setIsAdding(true);
    setAddDraft({
      ...emptyMaintenanceRecordDraft(defaultMileage),
      ...(attentionTaskId ? { attentionTaskId } : {}),
      ...(requestedLineItem ? { lineItems: requestedLineItem } : {}),
    });
    setConfirmAdd(false);
  };

  useEffect(() => {
    if (addRequestKey <= 0) return;
    startAdding(addRequestTaskId, addRequestLineItem);
    onAddRequestHandled?.();
    // The incrementing key represents an explicit owner action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addRequestKey, addRequestLineItem, addRequestTaskId, onAddRequestHandled]);

  const saveAdding = async () => {
    if (!onAddService || !addDraft || draftLineItems(addDraft).length === 0) return;
    setIsAddingSaving(true);
    try {
      await onAddService(addDraft);
      setHistoryFilter("all");
      setIsAdding(false);
      setAddDraft(null);
      setConfirmAdd(false);
    } finally {
      setIsAddingSaving(false);
    }
  };

  const renderEditForm = (entry: TimelineEntry) => {
    if (!draft) return null;
    return (
      <div className="space-y-3 border-t border-border/60 px-3.5 pb-4 pt-3 sm:px-4">
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
            Review the changes, then tap save again.
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

  const renderMergeReview = (review: NonNullable<typeof mergeReview>) => {
    const first = serviceEntries.find((entry) => entry.serviceId === review.candidate.firstServiceId);
    const second = serviceEntries.find((entry) => entry.serviceId === review.candidate.secondServiceId);
    if (!first || !second) return null;

    const sourceLabel = (entry: TimelineEntry) => {
      if (entry.source === "carfax_import") return "CARFAX";
      if (entry.source === "owner_note") return "Owner entry";
      if (entry.source === "receipt") return "Receipt";
      if (entry.source === "voice") return "Voice";
      return "Dealer";
    };
    const sourceChoice = (entry: TimelineEntry) => {
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
          <span className="mt-1 block text-sm font-semibold text-foreground">{formatDate(entry.serviceDate)}</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">{formatShopLine(entry)}</span>
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
          <div>
            <p className="text-sm font-semibold text-foreground">Assistant prepared one clean record</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Only this detected consecutive pair can be merged. Choose what to keep; typing is optional.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Keep date and shop from
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {sourceChoice(first)}
            {sourceChoice(second)}
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
                  if (draggedMergeItemIndex !== null) moveMergeLineItem(draggedMergeItemIndex, index);
                  setDraggedMergeItemIndex(null);
                }}
                onDragEnd={() => setDraggedMergeItemIndex(null)}
              >
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 text-foreground">{lineItem}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
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
                  className="h-7 w-7 shrink-0"
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
                  className="h-7 w-7 shrink-0 hover:bg-destructive/10 hover:text-destructive"
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
            onClick={() => setMergeReview(null)}
          >
            Cancel
          </Button>
          <span className="text-xs text-muted-foreground">Evidence combines automatically.</span>
        </div>
      </div>
    );
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
            <Button type="button" size="sm" disabled={disabled} onClick={() => startAdding()}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              Add maintenance record
            </Button>
          ) : null}
          {onGoToImport ? (
            <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onGoToImport}>
              Add records
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
          <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => startAdding()}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            Add maintenance
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter timeline">
        {OWNER_HISTORY_FILTERS.map((filter) => {
          const count = historyFilterCounts[filter.id];
          if (filter.id !== "all" && count === 0) return null;
          return (
            <Button
              key={filter.id}
              type="button"
              size="sm"
              variant={historyFilter === filter.id ? "secondary" : "ghost"}
              className="h-8 rounded-full px-3 text-xs"
              aria-pressed={historyFilter === filter.id}
              onClick={() => setHistoryFilter(filter.id)}
            >
              {filter.label}
              {filter.id !== "all" ? ` (${count})` : ""}
            </Button>
          );
        })}
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

      {resolvedVerifications.length > 0 ? (
        <details className="rounded-xl border border-border/70 bg-card/70 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            Verification history · {resolvedVerifications.length}
          </summary>
          <ul className="mt-3 space-y-2 border-t border-border/60 pt-3">
            {resolvedVerifications.map((item) => (
              <li key={item.taskId} className="flex flex-wrap items-start justify-between gap-2 text-sm">
                <span>
                  <span className="block font-medium text-foreground">{item.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.target?.label ?? "Assistant confirmation"}
                    {item.resolvedAt
                      ? ` · ${new Date(item.resolvedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}`
                      : ""}
                  </span>
                </span>
                <Badge variant="secondary">{resolutionLabel(item)}</Badge>
              </li>
            ))}
          </ul>
        </details>
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

      {yearGroups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
          No {historyFilter === "service" ? "service records" : "ownership events"} match this filter.
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-1 h-auto px-1 py-0 text-sm text-primary hover:text-primary"
            onClick={() => setHistoryFilter("all")}
          >
            Show all
          </Button>
        </div>
      ) : (
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
                      const isEditing = editingId === item.id;
                      const cardExpanded = isEditing || isExpanded;
                      const duplicateCandidate = duplicateByServiceId.get(item.id);
                      const showDuplicateFlag =
                        duplicateCandidate !== undefined &&
                        duplicateAnchorServiceId(duplicateCandidate) === item.id;
                      const pendingVerification = pendingVerificationByRecordId.get(item.id);
                      const location = entry.shopLocation?.trim();
                      const shopLine = location ? `${entry.shop} · ${location}` : entry.shop;

                      return (
                        <li
                          id={`history-record-${item.id}`}
                          key={item.id}
                          className={cn(
                            "overflow-hidden rounded-xl border bg-card/90 shadow-sm",
                            cardExpanded ? "history-interactive-active" : "border-border/70 history-interactive",
                            focusedRecordId === item.id &&
                              "ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
                          )}
                        >
                          <button
                            type="button"
                            className="flex w-full items-start gap-3 p-3.5 text-left sm:p-4"
                            aria-expanded={cardExpanded}
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
                                <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
                                  {pendingVerification ? (
                                    <Badge variant="warning" className="text-[10px]">
                                      Needs confirmation
                                    </Badge>
                                  ) : null}
                                  <Badge variant="secondary" className="text-[10px]">
                                    Service
                                  </Badge>
                                </span>
                              </div>
                              <p className="mt-0.5 text-sm text-muted-foreground">{shopLine}</p>
                              <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
                                {(item.mileage ?? 0).toLocaleString()} mi
                              </p>
                              {!cardExpanded && item.lineItems[0] ? (
                                <p className="mt-2 truncate text-sm text-muted-foreground">{item.lineItems[0]}</p>
                              ) : null}
                            </div>
                          </button>
                          {!isEditing && cardExpanded ? (
                            <div className="border-t border-border/60 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4">
                              <ul className="space-y-1.5 text-sm text-foreground/85">
                                {item.lineItems.map((line) => (
                                  <li key={line}>{line}</li>
                                ))}
                              </ul>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {pendingVerification && onReviewVerification ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={disabled}
                                    onClick={() => onReviewVerification(pendingVerification.taskId)}
                                  >
                                    Review confirmation
                                  </Button>
                                ) : null}
                                {showDuplicateFlag && duplicateCandidate && onMergeService ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="border-amber-500/30 bg-amber-500/5 text-amber-700 hover:bg-amber-500/10"
                                    disabled={disabled}
                                    onClick={() => startMergeReview(duplicateCandidate)}
                                  >
                                    <AlertTriangle className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                                    Review possible duplicate
                                  </Button>
                                ) : null}
                                {onUpdateService ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    disabled={disabled}
                                    onClick={() => startEditing(entry)}
                                  >
                                    <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                                    Edit record
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                          {isEditing ? renderEditForm(entry) : null}
                          {mergeReview?.anchorServiceId === item.id
                            ? renderMergeReview(mergeReview)
                            : null}
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
      )}
    </div>
  );
}
