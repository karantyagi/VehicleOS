"use client";

import { useMemo, useState } from "react";
import { Check, Clock3, Pencil, X } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ConsoleDetailPanel, ConsoleDetailPlaceholder, ConsoleSplit } from "@/components/console-split";
import { DataGridToolbar } from "@/components/data-grid-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TimelineEntry } from "@/lib/console-types";
import { downloadCsv, filterByQuery, sortRows } from "@/lib/data-grid-utils";
import { useConsoleListKeyboard } from "@/lib/use-console-list-keyboard";
import { useAppUiStore } from "@/lib/store/app-ui-store";
import { cn } from "@/lib/utils";

const sourceLabel = (source: TimelineEntry["source"]): string => {
  if (source === "receipt") return "Receipt";
  if (source === "voice") return "Voice";
  if (source === "dealer") return "Dealer";
  if (source === "carfax_import") return "CARFAX";
  return "Owner note";
};

const badgeVariant = (source: TimelineEntry["source"]) => {
  if (source === "voice") return "seasonal" as const;
  if (source === "dealer") return "oem" as const;
  return "default" as const;
};

type ServiceDraft = {
  shop: string;
  shopLocation: string;
  serviceDate: string;
  mileage: string;
  total: string;
  lineItems: string;
};

type MaintenanceTimelineConsoleProps = {
  entries: TimelineEntry[];
  disabled?: boolean;
  onOpenEvidence?: (documentId: string) => void;
  onUpdateService?: (serviceId: string, patch: Partial<TimelineEntry>) => Promise<void>;
  requireEditConfirmation?: boolean;
  ownerSimple?: boolean;
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

export function MaintenanceTimelineConsole({
  entries,
  disabled = false,
  onOpenEvidence,
  onUpdateService,
  requireEditConfirmation = false,
  ownerSimple = false,
}: MaintenanceTimelineConsoleProps) {
  const selectedId = useAppUiStore((s) => s.selectedTimelineId);
  const setSelectedId = useAppUiStore((s) => s.setSelectedTimelineId);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("date-desc");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ServiceDraft | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.serviceDate.localeCompare(a.serviceDate)),
    [entries],
  );

  const visible = useMemo(() => {
    const filtered = filterByQuery(entries, query, (row) =>
      [row.serviceDate, row.shop, row.shopLocation, row.mileage, sourceLabel(row.source), row.lineItems.join(" ")]
        .filter(Boolean)
        .join(" "),
    );
    if (sort === "mileage-desc") {
      return sortRows(filtered, (a, b) => a.mileage - b.mileage, "desc");
    }
    if (sort === "mileage-asc") {
      return sortRows(filtered, (a, b) => a.mileage - b.mileage, "asc");
    }
    return sortRows(filtered, (a, b) => a.serviceDate.localeCompare(b.serviceDate), "desc");
  }, [entries, query, sort]);

  const rowIds = useMemo(() => visible.map((entry) => entry.serviceId), [visible]);
  useConsoleListKeyboard({ rowIds, selectedId, onSelect: setSelectedId, enabled: !ownerSimple && visible.length > 0 });

  const startEditing = (entry: TimelineEntry) => {
    if (!onUpdateService || disabled) return;
    setEditingId(entry.serviceId);
    setDraft(entryToDraft(entry));
    setConfirmSave(false);
    if (!ownerSimple) {
      setSelectedId(entry.serviceId);
    }
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

  const renderLineItems = (lineItems: string[]) => (
    <ul className="mt-1 space-y-1 text-sm">
      {lineItems.map((item) => (
        <li key={item} className="leading-snug">
          {item}
        </li>
      ))}
    </ul>
  );

  const renderEditForm = (entry: TimelineEntry) => {
    if (!draft) return null;

    return (
      <div className="space-y-3 pt-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`edit-shop-${entry.serviceId}`}>Shop</Label>
            <Input
              id={`edit-shop-${entry.serviceId}`}
              value={draft.shop}
              disabled={isSaving}
              onChange={(event) => setDraft({ ...draft, shop: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-location-${entry.serviceId}`}>Location</Label>
            <Input
              id={`edit-location-${entry.serviceId}`}
              value={draft.shopLocation}
              disabled={isSaving}
              placeholder="City, ST"
              onChange={(event) => setDraft({ ...draft, shopLocation: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-date-${entry.serviceId}`}>Date</Label>
            <Input
              id={`edit-date-${entry.serviceId}`}
              value={draft.serviceDate}
              disabled={isSaving}
              onChange={(event) => setDraft({ ...draft, serviceDate: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-mileage-${entry.serviceId}`}>Mileage</Label>
            <Input
              id={`edit-mileage-${entry.serviceId}`}
              type="number"
              className="tabular-nums"
              value={draft.mileage}
              disabled={isSaving}
              onChange={(event) => setDraft({ ...draft, mileage: event.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`edit-total-${entry.serviceId}`}>Total</Label>
          <Input
            id={`edit-total-${entry.serviceId}`}
            value={draft.total}
            disabled={isSaving}
            onChange={(event) => setDraft({ ...draft, total: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`edit-lines-${entry.serviceId}`}>Line items</Label>
          <Textarea
            id={`edit-lines-${entry.serviceId}`}
            rows={Math.min(8, Math.max(3, draft.lineItems.split("\n").length))}
            value={draft.lineItems}
            disabled={isSaving}
            onChange={(event) => setDraft({ ...draft, lineItems: event.target.value })}
          />
        </div>
        {requireEditConfirmation && confirmSave ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-foreground">
            Save these changes to your service history?
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={isSaving} onClick={() => handleSaveClick(entry)}>
            <Check className="mr-1.5 h-4 w-4" />
            {requireEditConfirmation && !confirmSave ? "Review save" : "Save"}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={isSaving} onClick={cancelEditing}>
            <X className="mr-1.5 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Clock3}
        title="No service yet"
        description={
          ownerSimple
            ? undefined
            : "Add a receipt, voice note, or owner entry from Upload receipt or Owner notes intake to start your service history."
        }
      />
    );
  }

  if (ownerSimple) {
    return (
      <ul className="space-y-3">
        {sortedEntries.map((entry) => {
          const isEditing = editingId === entry.serviceId;

          return (
            <li key={entry.serviceId} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="font-semibold leading-tight">{entry.serviceDate}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatShopLine(entry)} · {entry.mileage.toLocaleString()} mi
              </p>
              {!isEditing ? (
                <>
                  <div className="mt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Services performed
                    </p>
                    {renderLineItems(entry.lineItems)}
                  </div>
                  {entry.total && entry.total !== "$0.00" ? (
                    <p className="mt-2 text-sm text-muted-foreground">Total: {entry.total}</p>
                  ) : null}
                  {onUpdateService ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      disabled={disabled}
                      onClick={() => startEditing(entry)}
                    >
                      <Pencil className="mr-1.5 h-4 w-4" />
                      Edit
                    </Button>
                  ) : null}
                </>
              ) : (
                renderEditForm(entry)
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  const selected =
    visible.find((e) => e.serviceId === selectedId) ??
    entries.find((e) => e.serviceId === selectedId) ??
    null;
  const isEditingSelected = selected && editingId === selected.serviceId;

  const list = (
    <>
      <DataGridToolbar
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        sortOptions={[
          { id: "date-desc", label: "Date (newest)" },
          { id: "mileage-desc", label: "Mileage (high)" },
          { id: "mileage-asc", label: "Mileage (low)" },
        ]}
        resultCount={visible.length}
        totalCount={entries.length}
        onExport={() =>
          downloadCsv(
            "vehicleos-timeline.csv",
            ["serviceId", "date", "shop", "location", "mileage", "source", "total", "lineItems"],
            visible.map((row) => [
              row.serviceId,
              row.serviceDate,
              row.shop,
              row.shopLocation ?? "",
              String(row.mileage),
              sourceLabel(row.source),
              row.total,
              row.lineItems.join("; "),
            ]),
          )
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Shop</TableHead>
            <TableHead className="text-right">Mileage</TableHead>
            <TableHead>Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((entry) => (
            <TableRow
              key={entry.serviceId}
              className={cn("cursor-pointer", selectedId === entry.serviceId && "bg-primary/10")}
              onClick={() => {
                if (editingId && editingId !== entry.serviceId) cancelEditing();
                setSelectedId(entry.serviceId);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedId(entry.serviceId);
                }
              }}
              tabIndex={0}
              role="button"
              aria-pressed={selectedId === entry.serviceId}
            >
              <TableCell className="font-medium tabular-nums">{entry.serviceDate}</TableCell>
              <TableCell className="max-w-[10rem] truncate" title={formatShopLine(entry)}>
                {formatShopLine(entry)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{entry.mileage.toLocaleString()}</TableCell>
              <TableCell>
                <Badge variant={badgeVariant(entry.source)}>{sourceLabel(entry.source)}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );

  const detail = selected ? (
    <ConsoleDetailPanel title={selected.serviceDate}>
      {isEditingSelected && draft ? (
        renderEditForm(selected)
      ) : (
        <>
          <p className="tabular-nums text-muted-foreground">
            {selected.mileage.toLocaleString()} mi · {formatShopLine(selected)}
            {selected.total && selected.total !== "$0.00" ? ` · ${selected.total}` : ""}
          </p>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Line items</p>
            {renderLineItems(selected.lineItems)}
          </div>
          {onUpdateService ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => startEditing(selected)}
            >
              <Pencil className="mr-1.5 h-4 w-4" />
              Edit service
            </Button>
          ) : null}
          {selected.evidenceIds.length > 0 && onOpenEvidence ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {selected.evidenceIds.map((documentId) => (
                <Button
                  key={documentId}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => onOpenEvidence(documentId)}
                >
                  View evidence
                </Button>
              ))}
            </div>
          ) : null}
        </>
      )}
    </ConsoleDetailPanel>
  ) : (
    <ConsoleDetailPlaceholder />
  );

  return <ConsoleSplit list={list} detail={detail} hasSelection={Boolean(selected)} emptyDetail={detail} />;
}
