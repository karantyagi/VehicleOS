import { resolveShopLocation } from "./infer-shop-location.js";
import { normalizeCarfaxLineItems } from "./normalize-carfax-line-items.js";
import type { VehicleOsImportService } from "./record-vehicleos-import.js";
import { stripGenericCarfaxVisitLineItems } from "../service/service-record-kind.js";

export type EnrichVehicleOsImportOptions = {
  ownerShopLocations?: Record<string, string>;
};

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

export const enrichVehicleOsImportService = (
  service: VehicleOsImportService,
  options?: EnrichVehicleOsImportOptions,
): VehicleOsImportService => ({
  ...service,
  shopLocation: resolveShopLocation({
    shop: service.shop,
    shopLocation: service.shopLocation,
    ownerShopLocations: options?.ownerShopLocations,
  }),
  lineItems: stripGenericCarfaxVisitLineItems(normalizeCarfaxLineItems(service.lineItems)),
});

export const enrichVehicleOsImport = (
  draft: VehicleOsImportDraft,
  options?: EnrichVehicleOsImportOptions,
): VehicleOsImportDraft => ({
  ...draft,
  services: draft.services.map((service) => enrichVehicleOsImportService(service, options)),
});
