import type { VehicleOsImportService } from "./record-vehicleos-import.js";
import { normalizeShopKey } from "./shop-location-keys.js";

export const mergeShopLocationsFromImport = (
  existing: Record<string, string> | undefined,
  services: VehicleOsImportService[],
): Record<string, string> => {
  const next = { ...(existing ?? {}) };

  for (const service of services) {
    const location = service.shopLocation?.trim();
    if (!location) continue;
    next[normalizeShopKey(service.shop)] = location;
  }

  return next;
};
