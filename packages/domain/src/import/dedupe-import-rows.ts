import type { ServiceTimelineEntry } from "../projections/types.js";
import type { VehicleOsImportService } from "./record-vehicleos-import.js";
import type { VehicleOsRmvRecord } from "./record-vehicleos-rmv-import.js";
import type { OwnershipRecordEntry } from "../projections/types.js";

export const normalizeDedupeText = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

export const normalizeShopKey = (shop: string): string =>
  normalizeDedupeText(shop).replace(/[^\w\s]/g, "");

/** Loose match — same service visit (date + odometer + shop). */
export const serviceRowFingerprint = (input: {
  serviceDate: string;
  mileage: number;
  shop: string;
}): string => `${input.serviceDate}|${input.mileage}|${normalizeShopKey(input.shop)}`;

export const timelineEntryFingerprint = (row: ServiceTimelineEntry): string =>
  serviceRowFingerprint({
    serviceDate: row.serviceDate,
    mileage: row.mileage,
    shop: row.shop,
  });

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
  const existingKeys = new Set(existingTimeline.map(timelineEntryFingerprint));
  const newRows: VehicleOsImportService[] = [];
  let skippedCount = 0;

  for (const service of incoming) {
    const key = serviceRowFingerprint(service);
    if (existingKeys.has(key)) {
      skippedCount += 1;
      continue;
    }
    existingKeys.add(key);
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
  const key = serviceRowFingerprint(input);
  return existingTimeline.some((row) => timelineEntryFingerprint(row) === key);
};
