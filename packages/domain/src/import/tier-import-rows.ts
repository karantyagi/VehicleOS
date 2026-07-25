import type { VehicleOsImportService } from "./record-vehicleos-import.js";
import { normalizeShopKey } from "./shop-location-keys.js";

export type ImportTrustTier = "auto" | "enriched" | "verify" | "block";

export type TieredImportRow = {
  index: number;
  service: VehicleOsImportService;
  tier: ImportTrustTier;
  reasons: string[];
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

const SHOPS_WITHOUT_LOCATION = new Set([
  "self reported",
  "self-service (diy)",
  "massachusetts",
]);

const shopNeedsLocation = (shop: string): boolean => !SHOPS_WITHOUT_LOCATION.has(normalizeShopKey(shop));

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
  const chronological = services.map((service, index) => ({ service, index }));
  const sortedByDate = [...chronological].sort((left, right) =>
    left.service.serviceDate.localeCompare(right.service.serviceDate),
  );

  let previousMileage: number | null = null;
  const mileageRegressionByIndex = new Map<number, boolean>();
  for (const entry of sortedByDate) {
    if (previousMileage !== null && entry.service.mileage < previousMileage) {
      mileageRegressionByIndex.set(entry.index, true);
    }
    previousMileage = entry.service.mileage;
  }

  const rows: TieredImportRow[] = services.map((service, index) => {
    const blockReason = isValidServiceRow(service);
    if (blockReason) {
      return { index, service, tier: "block", reasons: [blockReason] };
    }

    const reasons: string[] = [];
    let tier: ImportTrustTier = "auto";

    if (mileageRegressionByIndex.get(index)) {
      tier = "verify";
      reasons.push(
        `Mileage ${service.mileage.toLocaleString()} mi is lower than an earlier visit in this import.`,
      );
    }

    if (shopNeedsLocation(service.shop) && !service.shopLocation?.trim()) {
      tier = "verify";
      reasons.push(`Shop location missing for ${service.shop}.`);
    }

    if (service.lineItems.some((line) => line === "Service visit")) {
      if (tier === "auto") tier = "enriched";
      reasons.push("Boilerplate stripped — visit anchor kept.");
    }

    if (tier === "auto" && reasons.length === 0) {
      return { index, service, tier: "auto", reasons: [] };
    }

    if (tier === "auto" && reasons.length > 0) {
      return { index, service, tier: "enriched", reasons };
    }

    return { index, service, tier, reasons };
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
