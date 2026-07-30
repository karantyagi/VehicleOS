import type {
  OwnershipRecordEntry,
  ServiceTimelineEntry,
} from "../projections/types.js";

export type OwnerHistoryItemKind = "service" | "ownership";

export type OwnerHistoryItem = {
  id: string;
  kind: OwnerHistoryItemKind;
  date: string;
  mileage: number | null;
  lineItems: string[];
  shop?: string;
  shopLocation?: string;
  total?: string;
  evidenceIds?: string[];
  source?: ServiceTimelineEntry["source"];
  agency?: string;
  eventType?: OwnershipRecordEntry["eventType"];
  description?: string;
  ownershipSource?: OwnershipRecordEntry["source"];
};

export const buildOwnerHistoryTimeline = (input: {
  timeline: ServiceTimelineEntry[];
  ownershipRecords: OwnershipRecordEntry[];
}): OwnerHistoryItem[] => {
  const serviceItems: OwnerHistoryItem[] = input.timeline.map((entry) => ({
    id: entry.serviceId,
    kind: "service",
    date: entry.serviceDate,
    mileage: entry.mileage,
    lineItems: entry.lineItems,
    shop: entry.shop,
    shopLocation: entry.shopLocation,
    total: entry.total,
    evidenceIds: entry.evidenceIds,
    source: entry.source,
  }));

  const ownershipItems: OwnerHistoryItem[] = input.ownershipRecords.map((record) => ({
    id: record.recordId,
    kind: "ownership",
    date: record.recordDate,
    mileage: record.mileage,
    lineItems: [record.description, ...record.details].filter(Boolean),
    agency: record.agency,
    eventType: record.eventType,
    description: record.description,
    ownershipSource: record.source,
  }));

  return [...serviceItems, ...ownershipItems].sort((left, right) => right.date.localeCompare(left.date));
};
