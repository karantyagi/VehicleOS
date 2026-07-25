import { extractCarfaxServiceHistoryFromPdfText } from "./extract-carfax-service-history.js";
import type { VehicleOsImportService } from "./record-vehicleos-import.js";
import { normalizeCarfaxLineItems } from "./normalize-carfax-line-items.js";
import { resolveShopLocation } from "./infer-shop-location.js";

export type ParseCarfaxPdfTextResult = {
  services: VehicleOsImportService[];
  maxMileage: number;
  warnings: string[];
};

/** Layer 1 extract → services slice (legacy helper for rules path). */
export const parseCarfaxPdfText = (rawText: string): ParseCarfaxPdfTextResult => {
  const extract = extractCarfaxServiceHistoryFromPdfText({ rawText });
  return {
    services: extract.serviceRows.map((row) => ({
      shop: row.shop,
      shopLocation: resolveShopLocation({ shop: row.shop, shopLocation: row.shopLocation }),
      serviceDate: row.serviceDate,
      mileage: row.mileage,
      lineItems: normalizeCarfaxLineItems(row.lineItems),
      total: row.total,
    })),
    maxMileage: extract.vehicleHint.maxMileage,
    warnings: extract.warnings,
  };
};
