import type { VehicleOsImportService } from "./record-vehicleos-import.js";
import type { ServiceTimelineEntry } from "../projections/types.js";
import { crossDayMileageRegressionByIndex } from "./cross-day-mileage-regression.js";
import { stripGenericCarfaxVisitLineItems } from "../service/service-record-kind.js";
import { resolveCarfaxSourceTrust } from "./carfax-source-trust.js";
import {
  guidanceSummaryLine,
  mileageCrossDayGuidance,
  missingShopLocationGuidance,
  ownerDiyServiceGuidance,
  ownerReportedServiceGuidance,
  stateInspectionRecordGuidance,
  type ImportVerifyGuidance,
} from "./import-verify-guidance.js";

export type ImportTrustTier = "auto" | "enriched" | "verify" | "block";

export type TieredImportRow = {
  index: number;
  service: VehicleOsImportService;
  tier: ImportTrustTier;
  reasons: string[];
  ownerGuidance: ImportVerifyGuidance[];
};

export type TierImportSummary = {
  rows: TieredImportRow[];
  autoCount: number;
  enrichedCount: number;
  verifyCount: number;
  blockCount: number;
  readyCount: number;
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const shopNeedsLocation = (shop: string): boolean => resolveCarfaxSourceTrust(shop) === "provider";

const isValidServiceRow = (service: VehicleOsImportService): string | null => {
  if (!service.serviceDate?.trim() || !ISO_DATE_RE.test(service.serviceDate.trim())) {
    return "Service date is missing or invalid.";
  }
  if (!Number.isFinite(service.mileage) || service.mileage < 0) {
    return "Mileage is missing or invalid.";
  }
  if (!service.shop?.trim()) {
    return "Shop name is missing.";
  }
  if (!Array.isArray(service.lineItems) || service.lineItems.length === 0) {
    return "At least one service line item is required.";
  }
  return null;
};

export const tierImportRows = (services: VehicleOsImportService[]): TierImportSummary => {
  const normalizedServices = services.map((service) => ({
    ...service,
    lineItems: stripGenericCarfaxVisitLineItems(service.lineItems),
  }));
  const mileageRegressionByIndex = crossDayMileageRegressionByIndex(normalizedServices);

  const rows: TieredImportRow[] = normalizedServices.map((service, index) => {
    const blockReason = isValidServiceRow(service);
    if (blockReason) {
      return { index, service, tier: "block", reasons: [blockReason], ownerGuidance: [] };
    }

    // A generic CARFAX visit is valid history, not an incomplete import row.
    // It receives its quiet Limited details treatment after import.
    if (service.lineItems.some((line) => line === "Service visit")) {
      return { index, service, tier: "auto", reasons: [], ownerGuidance: [] };
    }

    const reasons: string[] = [];
    const ownerGuidance: ImportVerifyGuidance[] = [];
    let tier: ImportTrustTier = "auto";

    const priorDaysMax = mileageRegressionByIndex.get(index);
    if (priorDaysMax !== undefined) {
      tier = "verify";
      const guidance = mileageCrossDayGuidance({
        mileage: service.mileage,
        priorDaysMax,
        serviceDate: service.serviceDate,
      });
      ownerGuidance.push(guidance);
      reasons.push(guidanceSummaryLine(guidance));
    }

    if (shopNeedsLocation(service.shop) && !service.shopLocation?.trim()) {
      tier = "verify";
      const guidance = missingShopLocationGuidance(service.shop);
      ownerGuidance.push(guidance);
      reasons.push(guidanceSummaryLine(guidance));
    }

    const sourceTrust = resolveCarfaxSourceTrust(service.shop);
    const sourceGuidance =
      sourceTrust === "owner_reported"
        ? ownerReportedServiceGuidance()
        : sourceTrust === "owner_diy"
          ? ownerDiyServiceGuidance()
          : sourceTrust === "state_record"
            ? stateInspectionRecordGuidance()
            : undefined;
    if (sourceGuidance) {
      tier = "verify";
      ownerGuidance.push(sourceGuidance);
      reasons.push(guidanceSummaryLine(sourceGuidance));
    }

    if (tier === "auto" && reasons.length === 0) {
      return { index, service, tier: "auto", reasons: [], ownerGuidance: [] };
    }

    if (tier === "auto" && reasons.length > 0) {
      return { index, service, tier: "enriched", reasons, ownerGuidance: [] };
    }

    return { index, service, tier, reasons, ownerGuidance };
  });

  const autoCount = rows.filter((row) => row.tier === "auto").length;
  const enrichedCount = rows.filter((row) => row.tier === "enriched").length;
  const verifyCount = rows.filter((row) => row.tier === "verify").length;
  const blockCount = rows.filter((row) => row.tier === "block").length;

  return {
    rows,
    autoCount,
    enrichedCount,
    verifyCount,
    blockCount,
    readyCount: autoCount + enrichedCount,
  };
};

const timelineEntryToImportService = (entry: ServiceTimelineEntry): VehicleOsImportService => ({
  shop: entry.shop,
  shopLocation: entry.shopLocation,
  serviceDate: entry.serviceDate,
  mileage: entry.mileage,
  lineItems: entry.lineItems,
  total: entry.total,
  evidenceIds: entry.evidenceIds,
});

const emptyTierSummary = (): TierImportSummary => ({
  rows: [],
  autoCount: 0,
  enrichedCount: 0,
  verifyCount: 0,
  blockCount: 0,
  readyCount: 0,
});

/** Tier only incoming rows, with mileage checks against existing service history. */
export const tierNewImportRows = (
  existingTimeline: ServiceTimelineEntry[],
  newServices: VehicleOsImportService[],
): TierImportSummary => {
  if (newServices.length === 0) return emptyTierSummary();

  const existingServices = existingTimeline.map(timelineEntryToImportService);
  const combinedSummary = tierImportRows([...existingServices, ...newServices]);
  const rows = combinedSummary.rows.slice(existingServices.length).map((row, index) => ({
    ...row,
    index,
  }));

  const autoCount = rows.filter((row) => row.tier === "auto").length;
  const enrichedCount = rows.filter((row) => row.tier === "enriched").length;
  const verifyCount = rows.filter((row) => row.tier === "verify").length;
  const blockCount = rows.filter((row) => row.tier === "block").length;

  return {
    rows,
    autoCount,
    enrichedCount,
    verifyCount,
    blockCount,
    readyCount: autoCount + enrichedCount,
  };
};
