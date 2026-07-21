"use client";

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
    return <p className="muted">Upload a receipt to populate your evidence vault.</p>;
  }

  return (
    <ul className="evidence-vault-list">
      {items.map((item) => (
        <li key={item.documentId} className="evidence-vault-item">
          <div>
            <strong>{channelLabel(item.channel)} evidence</strong>
            <p className="muted">
              {new Date(item.ingestedAt).toLocaleString()} · immutable ·{" "}
              {linkedSet.has(item.documentId) ? "linked to service" : "stored"}
            </p>
          </div>
          <button
            type="button"
            className="link-button"
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
          </button>
        </li>
      ))}
    </ul>
  );
}
