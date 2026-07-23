"use client";

import { Clock3 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ConsoleDetailPanel, ConsoleDetailPlaceholder, ConsoleSplit } from "@/components/console-split";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppUiStore } from "@/lib/store/app-ui-store";
import { cn } from "@/lib/utils";

type TimelineEntry = {
  serviceId: string;
  shop: string;
  serviceDate: string;
  mileage: number;
  lineItems: string[];
  total: string;
  evidenceIds: string[];
  source?: "receipt" | "voice" | "owner_note" | "dealer";
};

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

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Clock3}
        title="No service history yet"
        description="Add a receipt, voice note, or owner entry from Receipts or More to start your timeline."
      />
    );
  }

  const selected = entries.find((e) => e.serviceId === selectedId) ?? null;

  const list = (
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
        {entries.map((entry) => (
          <TableRow
            key={entry.serviceId}
            data-state={selectedId === entry.serviceId ? "selected" : undefined}
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
