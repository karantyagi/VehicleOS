import type { ServiceTimelineEntry } from "../projections/types.js";
import type { VehicleOsImportService } from "./record-vehicleos-import.js";
import type { VehicleOsRmvRecord } from "./record-vehicleos-rmv-import.js";
import type { OwnershipRecordEntry } from "../projections/types.js";

export const normalizeDedupeText = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

export const normalizeShopKey = (shop: string): string =>
  normalizeDedupeText(shop).replace(/[^\w\s]/g, "");

/** Exact row — date, odometer, shop (legacy / strict). */
export const serviceRowFingerprint = (input: {
  serviceDate: string;
  mileage: number;
  shop: string;
}): string => `${input.serviceDate}|${input.mileage}|${normalizeShopKey(input.shop)}`;

/**
 * Same calendar visit — date + shop only.
 * Re-import and owner edits often change mileage slightly; same visit should not duplicate.
 */
export const serviceVisitFingerprint = (input: { serviceDate: string; shop: string }): string =>
  `${input.serviceDate}|${normalizeShopKey(input.shop)}`;

export const timelineVisitFingerprint = (row: ServiceTimelineEntry): string =>
  serviceVisitFingerprint({ serviceDate: row.serviceDate, shop: row.shop });

export const timelineEntryFingerprint = (row: ServiceTimelineEntry): string =>
  timelineVisitFingerprint(row);

export const ownershipRecordFingerprint = (input: {
  recordDate: string;
  eventType: string;
  agency: string;
  description: string;
}): string =>
  `${input.recordDate}|${input.eventType}|${normalizeDedupeText(input.agency)}|${normalizeDedupeText(input.description)}`;

export const ownershipEntryFingerprint = (row: OwnershipRecordEntry): string =>
  ownershipRecordFingerprint({
    recordDate: row.recordDate,
    eventType: row.eventType,
    agency: row.agency,
    description: row.description,
  });

export type DedupeFilterResult<T> = {
  newRows: T[];
  skippedCount: number;
};

export const filterNewImportServices = (
  existingTimeline: ServiceTimelineEntry[],
  incoming: VehicleOsImportService[],
): DedupeFilterResult<VehicleOsImportService> => {
  const existingVisitKeys = new Set(existingTimeline.map(timelineVisitFingerprint));
  const newRows: VehicleOsImportService[] = [];
  const seenIncoming = new Set<string>();
  let skippedCount = 0;

  for (const service of incoming) {
    const visitKey = serviceVisitFingerprint(service);
    if (existingVisitKeys.has(visitKey) || seenIncoming.has(visitKey)) {
      skippedCount += 1;
      continue;
    }
    seenIncoming.add(visitKey);
    existingVisitKeys.add(visitKey);
    newRows.push(service);
  }

  return { newRows, skippedCount };
};

export const filterNewOwnershipRecords = (
  existingRecords: OwnershipRecordEntry[],
  incoming: VehicleOsRmvRecord[],
): DedupeFilterResult<VehicleOsRmvRecord> => {
  const existingKeys = new Set(existingRecords.map(ownershipEntryFingerprint));
  const newRows: VehicleOsRmvRecord[] = [];
  let skippedCount = 0;

  for (const record of incoming) {
    const key = ownershipRecordFingerprint(record);
    if (existingKeys.has(key)) {
      skippedCount += 1;
      continue;
    }
    existingKeys.add(key);
    newRows.push(record);
  }

  return { newRows, skippedCount };
};

export const isDuplicateServiceRow = (
  existingTimeline: ServiceTimelineEntry[],
  input: { serviceDate: string; mileage: number; shop: string },
): boolean => {
  const visitKey = serviceVisitFingerprint(input);
  return existingTimeline.some((row) => timelineVisitFingerprint(row) === visitKey);
};
