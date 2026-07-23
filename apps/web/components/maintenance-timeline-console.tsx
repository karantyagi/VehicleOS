"use client";

import { useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ConsoleDetailPanel, ConsoleDetailPlaceholder, ConsoleSplit } from "@/components/console-split";
import { DataGridToolbar } from "@/components/data-grid-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  return "Owner note";
};

const badgeVariant = (source: TimelineEntry["source"]) => {
  if (source === "voice") return "seasonal" as const;
  if (source === "dealer") return "oem" as const;
  return "default" as const;
};

type MaintenanceTimelineConsoleProps = {
  entries: TimelineEntry[];
  disabled?: boolean;
  onOpenEvidence?: (documentId: string) => void;
};

export function MaintenanceTimelineConsole({
  entries,
  disabled = false,
  onOpenEvidence,
}: MaintenanceTimelineConsoleProps) {
  const selectedId = useAppUiStore((s) => s.selectedTimelineId);
  const setSelectedId = useAppUiStore((s) => s.setSelectedTimelineId);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("date-desc");

  const visible = useMemo(() => {
    const filtered = filterByQuery(entries, query, (row) =>
      [row.serviceDate, row.shop, row.mileage, sourceLabel(row.source), row.lineItems.join(" ")].join(" "),
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
  useConsoleListKeyboard({ rowIds, selectedId, onSelect: setSelectedId, enabled: visible.length > 0 });

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Clock3}
        title="No service history yet"
        description="Add a receipt, voice note, or owner entry from Receipts or More to start your timeline."
      />
    );
  }

  const selected = visible.find((e) => e.serviceId === selectedId) ?? entries.find((e) => e.serviceId === selectedId) ?? null;

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
            ["serviceId", "date", "shop", "mileage", "source", "total", "lineItems"],
            visible.map((row) => [
              row.serviceId,
              row.serviceDate,
              row.shop,
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
              onClick={() => setSelectedId(entry.serviceId)}
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
              <TableCell className="max-w-[8rem] truncate">{entry.shop}</TableCell>
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
      <p className="tabular-nums text-muted-foreground">
        {selected.mileage.toLocaleString()} mi · {selected.shop}
        {selected.total && selected.total !== "$0.00" ? ` · ${selected.total}` : ""}
      </p>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Line items</p>
        <p className="mt-1">{selected.lineItems.join(", ")}</p>
      </div>
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
    </ConsoleDetailPanel>
  ) : (
    <ConsoleDetailPlaceholder />
  );

  return (
    <ConsoleSplit list={list} detail={detail} hasSelection={Boolean(selected)} emptyDetail={detail} />
  );
}
