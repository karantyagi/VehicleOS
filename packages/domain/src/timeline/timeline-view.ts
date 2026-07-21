import type { ServiceRecordSource } from "../events/catalog.js";
import type { EvidenceVaultEntry, ServiceTimelineEntry } from "../projections/types.js";

export const resolveServiceSource = (
  entry: ServiceTimelineEntry,
  evidenceVault: EvidenceVaultEntry[],
): ServiceRecordSource => {
  if (entry.source) return entry.source;

  const channel = entry.evidenceIds
    .map((documentId) => evidenceVault.find((doc) => doc.documentId === documentId)?.channel)
    .find(Boolean);

  if (channel === "voice") return "voice";
  if (channel === "receipt_upload" || channel === "photo") return "receipt";
  return "owner_note";
};

export const sortTimelineEntries = (entries: ServiceTimelineEntry[]): ServiceTimelineEntry[] =>
  [...entries].sort((left, right) => {
    const dateCompare = right.serviceDate.localeCompare(left.serviceDate);
    if (dateCompare !== 0) return dateCompare;
    return right.mileage - left.mileage;
  });

export const enrichTimelineForDisplay = (
  entries: ServiceTimelineEntry[],
  evidenceVault: EvidenceVaultEntry[],
): ServiceTimelineEntry[] =>
  sortTimelineEntries(
    entries.map((entry) => ({
      ...entry,
      source: resolveServiceSource(entry, evidenceVault),
    })),
  );

export const serviceSourceLabel = (source: ServiceRecordSource): string => {
  if (source === "receipt") return "Receipt";
  if (source === "voice") return "Voice note";
  if (source === "dealer") return "Dealer";
  return "Owner note";
};
