"use client";

import { Archive } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { openEvidenceDocument } from "../lib/evidence-access";

export type EvidenceVaultItem = {
  documentId: string;
  storageKey: string;
  channel: string;
  ingestedAt: string;
  immutable: true;
};

type EvidenceVaultPanelProps = {
  vehicleId: string;
  apiBase: string;
  items: EvidenceVaultItem[];
  linkedDocumentIds?: string[];
};

const channelLabel = (channel: string): string =>
  channel === "photo" ? "Photo" : channel === "receipt_upload" ? "PDF" : channel;

export function EvidenceVaultPanel({
  vehicleId,
  apiBase,
  items,
  linkedDocumentIds = [],
}: EvidenceVaultPanelProps) {
  const linkedSet = new Set(linkedDocumentIds);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Archive}
        title="No evidence yet"
        description="Upload a receipt from the Receipts section to populate your immutable vault."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.documentId}
          className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm">{channelLabel(item.channel)} evidence</strong>
              <Badge variant={linkedSet.has(item.documentId) ? "default" : "secondary"}>
                {linkedSet.has(item.documentId) ? "Linked" : "Stored"}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(item.ingestedAt).toLocaleString()} · immutable
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() =>
              void openEvidenceDocument({
                apiBase,
                vehicleId,
                documentId: item.documentId,
              }).then((result) => {
                if (!result.ok) alert(result.error);
              })
            }
          >
            View original
          </Button>
        </li>
      ))}
    </ul>
  );
}
