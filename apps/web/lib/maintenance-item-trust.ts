import type { MaintenanceRecordDraft } from "@/components/maintenance-record-fields";
import { todayIsoDate } from "@/lib/date-input";
import type { TimelineEntry } from "@/lib/console-types";

const lineItemsFromDraft = (draft: MaintenanceRecordDraft): string[] =>
  draft.lineItems
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export const buildMaintenanceRecordDraft = (
  currentMileage: number,
  recordLineItem: string,
): MaintenanceRecordDraft => ({
  shop: "",
  shopLocation: "",
  serviceDate: todayIsoDate(),
  mileage: String(currentMileage),
  total: "",
  lineItems: recordLineItem,
  ownerNote: "",
  voiceTranscript: "",
  captureChannel: "manual",
});

export const buildMaintenanceCorrectionDraft = (
  entry: TimelineEntry,
): MaintenanceRecordDraft => ({
  shop: entry.shop,
  shopLocation: entry.shopLocation ?? "",
  serviceDate: entry.serviceDate,
  mileage: String(entry.mileage),
  total: entry.total,
  lineItems: entry.lineItems.join("\n"),
  ownerNote: "",
  voiceTranscript: "",
  captureChannel: "manual",
});

export const maintenancePatchFromDraft = (
  draft: MaintenanceRecordDraft,
): Partial<TimelineEntry> => ({
  shop: draft.shop.trim() || "Unknown shop",
  shopLocation: draft.shopLocation.trim() || undefined,
  serviceDate: draft.serviceDate,
  mileage: Math.round(Number(draft.mileage)),
  total: draft.total.trim(),
  lineItems: lineItemsFromDraft(draft),
});
