"use client";

import { Clock3 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  if (source === "voice") return "Voice note";
  if (source === "dealer") return "Dealer";
  return "Owner note";
};

const badgeVariant = (source: TimelineEntry["source"]) => {
  if (source === "voice") return "seasonal" as const;
  if (source === "dealer") return "oem" as const;
  return "default" as const;
};

type MaintenanceTimelinePanelProps = {
  entries: TimelineEntry[];
  disabled?: boolean;
  onOpenEvidence?: (documentId: string) => void;
};

export function MaintenanceTimelinePanel({
  entries,
  disabled = false,
  onOpenEvidence,
}: MaintenanceTimelinePanelProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Clock3}
        title="No service history yet"
        description="Add a receipt, voice note, or owner entry from Receipts or More to start your timeline."
      />
    );
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-4 sm:pl-6">
      {entries.map((entry) => (
        <li key={entry.serviceId} className="relative rounded-lg border border-border bg-card p-4 shadow-sm">
          <span className="absolute -left-[calc(0.5rem+1px)] top-5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary sm:-left-[calc(0.75rem+1px)]" />
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm">{entry.serviceDate}</strong>
            <Badge variant={badgeVariant(entry.source)}>{sourceLabel(entry.source)}</Badge>
          </div>
          <p className="mt-1 text-sm tabular-nums text-muted-foreground">
            {entry.mileage.toLocaleString()} mi · {entry.shop}
            {entry.total && entry.total !== "$0.00" ? ` · ${entry.total}` : ""}
          </p>
          <p className="mt-2 text-sm">{entry.lineItems.join(", ")}</p>
          {entry.evidenceIds.length > 0 && onOpenEvidence ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {entry.evidenceIds.map((documentId) => (
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
        </li>
      ))}
    </ol>
  );
}
