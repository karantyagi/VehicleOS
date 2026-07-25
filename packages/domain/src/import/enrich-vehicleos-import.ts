import { resolveShopLocation } from "./infer-shop-location.js";
import { normalizeCarfaxLineItems } from "./normalize-carfax-line-items.js";
import type { VehicleOsImportService } from "./record-vehicleos-import.js";

export type VehicleOsImportDraft = {
  version: "1";
  source: string;
  exportedAt: string;
  vehicle: {
    vin: string;
    year: number;
    make: string;
    model: string;
    trim?: string;
    currentMileage: number;
  };
  services: VehicleOsImportService[];
};

export const enrichVehicleOsImportService = (service: VehicleOsImportService): VehicleOsImportService => ({
  ...service,
  shopLocation: resolveShopLocation({ shop: service.shop, shopLocation: service.shopLocation }),
  lineItems: normalizeCarfaxLineItems(service.lineItems),
});

export const enrichVehicleOsImport = (draft: VehicleOsImportDraft): VehicleOsImportDraft => ({
  ...draft,
  services: draft.services.map(enrichVehicleOsImportService),
});
