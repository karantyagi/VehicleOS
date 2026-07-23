"use client";

import { Archive } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ConsoleDetailPanel, ConsoleDetailPlaceholder, ConsoleSplit } from "@/components/console-split";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Archive}
        title="No evidence yet"
        description="Upload a receipt from the Receipts section to populate your immutable vault."
      />
    );
  }

  const selected = items.find((i) => i.documentId === selectedId) ?? null;

  const openOriginal = (documentId: string) => {
    void openEvidenceDocument({ apiBase, vehicleId, documentId }).then((result) => {
      if (!result.ok) notify(result.error, "error");
    });
  };

  const list = (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ingested</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow
            key={item.documentId}
            data-state={selectedId === item.documentId ? "selected" : undefined}
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

  return (
    <ConsoleSplit list={list} detail={detail} hasSelection={Boolean(selected)} emptyDetail={detail} />
  );
}
