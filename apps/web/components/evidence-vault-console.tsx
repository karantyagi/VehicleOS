"use client";

import { useMemo, useState } from "react";
import { Archive } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ConsoleDetailPanel, ConsoleDetailPlaceholder, ConsoleSplit } from "@/components/console-split";
import { DataGridToolbar } from "@/components/data-grid-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadCsv, filterByQuery, sortRows } from "@/lib/data-grid-utils";
import { useConsoleListKeyboard } from "@/lib/use-console-list-keyboard";
import { useAppUiStore } from "@/lib/store/app-ui-store";
import { cn } from "@/lib/utils";
import { openEvidenceDocument } from "../lib/evidence-access";
import { notify } from "@/lib/notify";

export type EvidenceVaultItem = {
  documentId: string;
  storageKey: string;
  channel: string;
  ingestedAt: string;
  immutable: true;
};

type EvidenceVaultConsoleProps = {
  vehicleId: string;
  apiBase: string;
  items: EvidenceVaultItem[];
  linkedDocumentIds?: string[];
};

const channelLabel = (channel: string): string =>
  channel === "photo" ? "Photo" : channel === "receipt_upload" ? "PDF" : channel;

export function EvidenceVaultConsole({
  vehicleId,
  apiBase,
  items,
  linkedDocumentIds = [],
}: EvidenceVaultConsoleProps) {
  const linkedSet = new Set(linkedDocumentIds);
  const selectedId = useAppUiStore((s) => s.selectedEvidenceId);
  const setSelectedId = useAppUiStore((s) => s.setSelectedEvidenceId);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("ingested-desc");

  const visible = useMemo(() => {
    const filtered = filterByQuery(items, query, (row) =>
      [channelLabel(row.channel), row.documentId, row.storageKey].join(" "),
    );
    return sortRows(filtered, (a, b) => a.ingestedAt.localeCompare(b.ingestedAt), sort === "ingested-asc" ? "asc" : "desc");
  }, [items, query, sort]);

  const rowIds = useMemo(() => visible.map((item) => item.documentId), [visible]);
  useConsoleListKeyboard({ rowIds, selectedId, onSelect: setSelectedId, enabled: visible.length > 0 });

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Archive}
        title="No evidence yet"
        description="Upload a receipt from the Receipts section to populate your immutable vault."
      />
    );
  }

  const selected = visible.find((i) => i.documentId === selectedId) ?? items.find((i) => i.documentId === selectedId) ?? null;

  const openOriginal = (documentId: string) => {
    void openEvidenceDocument({ apiBase, vehicleId, documentId }).then((result) => {
      if (!result.ok) notify(result.error, "error");
    });
  };

  const list = (
    <>
      <DataGridToolbar
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        sortOptions={[
          { id: "ingested-desc", label: "Ingested (newest)" },
          { id: "ingested-asc", label: "Ingested (oldest)" },
        ]}
        resultCount={visible.length}
        totalCount={items.length}
        onExport={() =>
          downloadCsv(
            "vehicleos-evidence.csv",
            ["documentId", "channel", "ingestedAt", "linked"],
            visible.map((row) => [
              row.documentId,
              channelLabel(row.channel),
              row.ingestedAt,
              linkedSet.has(row.documentId) ? "yes" : "no",
            ]),
          )
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ingested</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((item) => (
            <TableRow
              key={item.documentId}
              className={cn("cursor-pointer", selectedId === item.documentId && "bg-primary/10")}
              onClick={() => setSelectedId(item.documentId)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedId(item.documentId);
                }
              }}
              tabIndex={0}
              role="button"
              aria-pressed={selectedId === item.documentId}
            >
              <TableCell className="font-medium">{channelLabel(item.channel)}</TableCell>
              <TableCell>
                <Badge variant={linkedSet.has(item.documentId) ? "default" : "secondary"}>
                  {linkedSet.has(item.documentId) ? "Linked" : "Stored"}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {new Date(item.ingestedAt).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );

  const detail = selected ? (
    <ConsoleDetailPanel
      title={`${channelLabel(selected.channel)} evidence`}
      actions={
        <Button type="button" size="sm" variant="outline" onClick={() => openOriginal(selected.documentId)}>
          View original
        </Button>
      }
    >
      <p className="text-muted-foreground">{new Date(selected.ingestedAt).toLocaleString()}</p>
      <p>
        <Badge variant={linkedSet.has(selected.documentId) ? "default" : "secondary"}>
          {linkedSet.has(selected.documentId) ? "Linked to timeline" : "Stored only"}
        </Badge>
      </p>
      <p className="font-mono text-xs text-muted-foreground break-all">{selected.documentId}</p>
      <p className="text-xs text-muted-foreground">Immutable artifact — content hash verified at ingest.</p>
    </ConsoleDetailPanel>
  ) : (
    <ConsoleDetailPlaceholder />
  );

  return <ConsoleSplit list={list} detail={detail} hasSelection={Boolean(selected)} emptyDetail={detail} />;
}
