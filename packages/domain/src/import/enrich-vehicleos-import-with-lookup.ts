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
import { inferShopLocation } from "./infer-shop-location.js";
import { resolveCarfaxSourceTrust } from "./carfax-source-trust.js";
import type { ImportLocationEvidence } from "./import-location-evidence.js";
import {
  shopLocationHintFromLookup,
  type ShopLocationHint,
} from "./shop-location-hints.js";

export type EnrichWithLookupOptions = EnrichVehicleOsImportOptions & {
  hintCity?: string;
  lookupPort?: ShopLocationLookupPort;
};

export type EnrichWithLookupResult = {
  draft: VehicleOsImportDraft;
  shopLocationHints: Record<string, ShopLocationHint>;
  locationEvidence: Record<string, ImportLocationEvidence>;
};

type LookupCache = Map<string, Awaited<ReturnType<typeof resolveShopLocationWithLookup>>>;

type EnrichedServiceWithEvidence = {
  service: VehicleOsImportService;
  evidence: ImportLocationEvidence;
};

const recordLookupHint = (
  hints: Record<string, ShopLocationHint>,
  shop: string,
  lookupResult?: Awaited<ReturnType<typeof resolveShopLocationWithLookup>>,
): void => {
  const key = normalizeShopKey(shop);
  const hint = shopLocationHintFromLookup(shop, lookupResult?.lookup);
  if (hint) hints[key] = hint;
};

const enrichServiceWithLocationEvidence = async (
  service: VehicleOsImportService,
  options?: EnrichWithLookupOptions,
  lookupCache?: LookupCache,
  hints?: Record<string, ShopLocationHint>,
): Promise<EnrichedServiceWithEvidence> => {
  const base = enrichVehicleOsImportService(service, {
    ownerShopLocations: options?.ownerShopLocations,
  });
  const sourceTrust = resolveCarfaxSourceTrust(service.shop);
  if (sourceTrust === "owner_reported") {
    return {
      service: base,
      evidence: {
        status: "owner_reported",
        message: "Owner-reported work has no service-provider location to validate.",
      },
    };
  }
  if (sourceTrust === "owner_diy") {
    return {
      service: base,
      evidence: {
        status: "owner_diy",
        message: "DIY work has no service-provider location to validate.",
      },
    };
  }
  if (sourceTrust === "state_record") {
    return {
      service: base,
      evidence: {
        status: "state_record",
        message: "State record â€” CARFAX did not provide an individual inspection location.",
      },
    };
  }

  const explicitLocation = service.shopLocation?.trim();
  if (explicitLocation) {
    return { service: base, evidence: { status: "carfax_reported", location: explicitLocation } };
  }

  const ownerLocation = options?.ownerShopLocations?.[normalizeShopKey(service.shop)]?.trim();
  if (ownerLocation) {
    return { service: base, evidence: { status: "owner_memory", location: ownerLocation } };
  }

  const curatedLocation = inferShopLocation(service.shop);
  if (curatedLocation) {
    return { service: base, evidence: { status: "curated_pack", location: curatedLocation } };
  }

  if (!options?.lookupPort) {
    return {
      service: base,
      evidence: {
        status: "not_initialized",
        message: "Shop location lookup is unavailable for this import.",
      },
    };
  }

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
  if (hints) recordLookupHint(hints, service.shop, lookupResult);

  if (lookupResult?.shopLocation) {
    return {
      service: { ...base, shopLocation: lookupResult.shopLocation },
      evidence: { status: "geoapify", location: lookupResult.shopLocation },
    };
  }

  const lookup = lookupResult?.lookup;
  const message = lookup && lookup.status !== "resolved" ? lookup.message : undefined;
  return {
    service: base,
    evidence: {
      status:
        lookup?.status === "ambiguous"
          ? "ambiguous"
          : lookup?.status === "not_initialized"
            ? "not_initialized"
            : "not_found",
      message,
    },
  };
};

export const enrichVehicleOsImportServiceWithLookup = async (
  service: VehicleOsImportService,
  options?: EnrichWithLookupOptions,
  lookupCache?: LookupCache,
  hints?: Record<string, ShopLocationHint>,
): Promise<VehicleOsImportService> =>
  (await enrichServiceWithLocationEvidence(service, options, lookupCache, hints)).service;

export const enrichVehicleOsImportWithLookup = async (
  draft: VehicleOsImportDraft,
  options?: EnrichWithLookupOptions,
): Promise<VehicleOsImportDraft> => {
  const result = await enrichVehicleOsImportWithLookupAndHints(draft, options);
  return result.draft;
};

export const enrichVehicleOsImportWithLookupAndHints = async (
  draft: VehicleOsImportDraft,
  options?: EnrichWithLookupOptions,
): Promise<EnrichWithLookupResult> => {
  const cache: LookupCache = new Map();
  const shopLocationHints: Record<string, ShopLocationHint> = {};
  const locationEvidence: Record<string, ImportLocationEvidence> = {};
  const services: VehicleOsImportService[] = [];

  for (const service of draft.services) {
    const enriched = await enrichServiceWithLocationEvidence(service, options, cache, shopLocationHints);
    services.push(enriched.service);
    locationEvidence[normalizeShopKey(service.shop)] = enriched.evidence;
  }

  return {
    draft: enrichVehicleOsImport({ ...draft, services }, { ownerShopLocations: options?.ownerShopLocations }),
    shopLocationHints,
    locationEvidence,
  };
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
