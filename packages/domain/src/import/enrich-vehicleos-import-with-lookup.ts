import type { VehicleOsImportService } from "./record-vehicleos-import.js";
import {
  enrichVehicleOsImport,
  enrichVehicleOsImportService,
  type EnrichVehicleOsImportOptions,
  type VehicleOsImportDraft,
} from "./enrich-vehicleos-import.js";
import type { ShopLocationLookupPort } from "./lookup-shop-location-port.js";
import { normalizeShopKey } from "./shop-location-keys.js";
import { resolveShopLocationWithLookup } from "./resolve-shop-location-with-lookup.js";

const SHOPS_SKIP_LOOKUP = new Set(["self reported", "self-service (diy)", "massachusetts"]);

export type EnrichWithLookupOptions = EnrichVehicleOsImportOptions & {
  hintCity?: string;
  lookupPort?: ShopLocationLookupPort;
};

type LookupCache = Map<string, Awaited<ReturnType<typeof resolveShopLocationWithLookup>>>;

export const enrichVehicleOsImportServiceWithLookup = async (
  service: VehicleOsImportService,
  options?: EnrichWithLookupOptions,
  lookupCache?: LookupCache,
): Promise<VehicleOsImportService> => {
  const base = enrichVehicleOsImportService(service, {
    ownerShopLocations: options?.ownerShopLocations,
  });
  if (base.shopLocation) return base;
  if (SHOPS_SKIP_LOOKUP.has(normalizeShopKey(service.shop))) return base;
  if (!options?.lookupPort) return base;

  const cacheKey = normalizeShopKey(service.shop);
  const cache = lookupCache ?? new Map<string, Awaited<ReturnType<typeof resolveShopLocationWithLookup>>>();

  if (!cache.has(cacheKey)) {
    cache.set(
      cacheKey,
      await resolveShopLocationWithLookup(
        {
          shop: service.shop,
          shopLocation: service.shopLocation,
          ownerShopLocations: options.ownerShopLocations,
          hintCity: options.hintCity,
        },
        options.lookupPort,
      ),
    );
  }

  const lookupResult = cache.get(cacheKey);
  if (lookupResult?.shopLocation) {
    return { ...base, shopLocation: lookupResult.shopLocation };
  }

  return base;
};

export const enrichVehicleOsImportWithLookup = async (
  draft: VehicleOsImportDraft,
  options?: EnrichWithLookupOptions,
): Promise<VehicleOsImportDraft> => {
  const cache: LookupCache = new Map();
  const services: VehicleOsImportService[] = [];

  for (const service of draft.services) {
    services.push(await enrichVehicleOsImportServiceWithLookup(service, options, cache));
  }

  return enrichVehicleOsImport({ ...draft, services }, { ownerShopLocations: options?.ownerShopLocations });
};

export const enrichVehicleOsImportServicesWithLookup = async (
  services: VehicleOsImportService[],
  options?: EnrichWithLookupOptions,
): Promise<VehicleOsImportService[]> => {
  const cache: LookupCache = new Map();
  const enriched: VehicleOsImportService[] = [];

  for (const service of services) {
    enriched.push(await enrichVehicleOsImportServiceWithLookup(service, options, cache));
  }

  return enriched;
};
