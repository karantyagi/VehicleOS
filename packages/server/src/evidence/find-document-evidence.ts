import { EVENT_TYPES, type CatalogDomainEvent } from "@vehicleos/domain";

export type DocumentEvidence = {
  documentId: string;
  storageKey: string;
  channel: string;
  ingestedAt: string;
};

export const findDocumentEvidence = (
  events: CatalogDomainEvent[],
  documentId: string,
): DocumentEvidence | null => {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.eventType !== EVENT_TYPES.DOCUMENT_INGESTED) continue;
    if (event.payload.documentId !== documentId) continue;

    return {
      documentId: event.payload.documentId,
      storageKey: event.payload.storageKey,
      channel: event.payload.channel,
      ingestedAt: event.createdAt,
    };
  }

  return null;
};

export const isStorageKeyOwnedByUser = (
  storageKey: string,
  userId: string,
  vehicleId: string,
): boolean => storageKey.startsWith(`${userId}/${vehicleId}/`);
