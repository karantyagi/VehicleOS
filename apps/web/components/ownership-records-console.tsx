"use client";

import { useMemo, useState } from "react";
import { FileBadge2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ConsoleDetailPanel, ConsoleDetailPlaceholder, ConsoleSplit } from "@/components/console-split";
import { DataGridToolbar } from "@/components/data-grid-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OwnershipRecordEntry } from "@/lib/console-types";
import { downloadCsv, filterByQuery, sortRows } from "@/lib/data-grid-utils";
import { RMV_EVENT_LABELS } from "@/lib/record-import-types";
import { useConsoleListKeyboard } from "@/lib/use-console-list-keyboard";
import { useAppUiStore } from "@/lib/store/app-ui-store";
import { cn } from "@/lib/utils";

type OwnershipRecordsConsoleProps = {
  entries: OwnershipRecordEntry[];
  disabled?: boolean;
  onGoToImport?: () => void;
};

const sourceLabel = (source: OwnershipRecordEntry["source"]): string =>
  source === "rmv_import" ? "RMV import" : "CARFAX import";

export function OwnershipRecordsConsole({
  entries,
  disabled = false,
  onGoToImport,
}: OwnershipRecordsConsoleProps) {
  const selectedId = useAppUiStore((s) => s.selectedOwnershipRecordId);
  const setSelectedId = useAppUiStore((s) => s.setSelectedOwnershipRecordId);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("date-desc");

  const visible = useMemo(() => {
    const filtered = filterByQuery(entries, query, (row) =>
      [
        row.recordDate,
        row.agency,
        row.description,
        RMV_EVENT_LABELS[row.eventType],
        sourceLabel(row.source),
        row.details.join(" "),
      ].join(" "),
    );
    return sortRows(filtered, (a, b) => a.recordDate.localeCompare(b.recordDate), sort === "date-asc" ? "asc" : "desc");
  }, [entries, query, sort]);

  const rowIds = useMemo(() => visible.map((entry) => entry.recordId), [visible]);
  useConsoleListKeyboard({ rowIds, selectedId, onSelect: setSelectedId, enabled: visible.length > 0 });

  if (entries.length === 0) {
    return (
      <div className="space-y-3">
        <EmptyState
          icon={FileBadge2}
          title="No ownership records yet"
          description="Import registration and title events from Record import → RMV / DMV. These stay separate from your maintenance timeline."
        />
        {onGoToImport ? (
          <div className="flex justify-center">
            <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onGoToImport}>
              Go to Record import
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  const selected =
    visible.find((entry) => entry.recordId === selectedId) ??
    entries.find((entry) => entry.recordId === selectedId) ??
    null;

  const list = (
    <>
      <DataGridToolbar
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        sortOptions={[
          { id: "date-desc", label: "Date (newest)" },
          { id: "date-asc", label: "Date (oldest)" },
        ]}
        resultCount={visible.length}
        totalCount={entries.length}
        onExport={() =>
          downloadCsv(
            "vehicleos-ownership-records.csv",
            ["recordId", "date", "eventType", "agency", "description", "source", "details"],
            visible.map((row) => [
              row.recordId,
              row.recordDate,
              RMV_EVENT_LABELS[row.eventType],
              row.agency,
              row.description,
              sourceLabel(row.source),
              row.details.join("; "),
            ]),
          )
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((entry) => (
            <TableRow
              key={entry.recordId}
              className={cn("cursor-pointer", selectedId === entry.recordId && "bg-primary/10")}
              onClick={() => setSelectedId(entry.recordId)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedId(entry.recordId);
                }
              }}
              tabIndex={0}
              role="button"
              aria-pressed={selectedId === entry.recordId}
            >
              <TableCell className="font-medium tabular-nums">{entry.recordDate}</TableCell>
              <TableCell>
                <Badge variant="outline">{RMV_EVENT_LABELS[entry.eventType]}</Badge>
              </TableCell>
              <TableCell className="max-w-[14rem] truncate">{entry.description}</TableCell>
              <TableCell className="text-muted-foreground">{sourceLabel(entry.source)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );

  const detail = selected ? (
    <ConsoleDetailPanel title={RMV_EVENT_LABELS[selected.eventType]}>
      <p className="text-muted-foreground">{selected.recordDate}</p>
      <p className="font-medium">{selected.description}</p>
      <p className="text-sm text-muted-foreground">{selected.agency}</p>
      {selected.mileage != null ? (
        <p className="tabular-nums text-sm text-muted-foreground">{selected.mileage.toLocaleString()} mi</p>
      ) : null}
      {selected.details.length > 0 ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Details</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm">
            {selected.details.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <Badge variant="secondary">{sourceLabel(selected.source)}</Badge>
    </ConsoleDetailPanel>
  ) : (
    <ConsoleDetailPlaceholder />
  );

  return (
    <ConsoleSplit list={list} detail={detail} hasSelection={Boolean(selected)} emptyDetail={detail} />
  );
}
