import {
  loadSupportedVehicleCatalog,
  loadTier2000SourceByPackId,
  resolvePackIdForVehicle,
  resolveScheduleDepthForPack,
  resolveScheduleSourceLineForPack,
} from "@vehicleos/knowledge";
import { jsonResponse, type JsonResponse } from "./json-response.js";

let tier2000SourceByPackId: ReturnType<typeof loadTier2000SourceByPackId> | null = null;
let tier2000SourceLoadFailed = false;

const getTier2000SourceByPackId = (): ReturnType<typeof loadTier2000SourceByPackId> => {
  if (tier2000SourceLoadFailed) return new Map();
  if (tier2000SourceByPackId) return tier2000SourceByPackId;

  try {
    tier2000SourceByPackId = loadTier2000SourceByPackId();
    return tier2000SourceByPackId;
  } catch (error) {
    tier2000SourceLoadFailed = true;
    console.error("tier2000 registry load failed — scheduleSourceLine disabled", error);
    return new Map();
  }
};

export type VehicleSupportQuery = {
  year?: string | number;
  make?: string;
  model?: string;
  trim?: string;
};

export type ListSupportedVehiclesOptions = {
  verifiedOnly?: boolean;
  make?: string;
  model?: string;
  year?: number;
  q?: string;
  limit?: number;
  offset?: number;
};

const normalizeSearch = (value: string): string => value.trim().toLowerCase();

export const filterSupportedVehicleRows = <
  T extends {
    make: string;
    model: string;
    year: number;
    trim: string;
    powertrain?: string | null;
    packId: string;
    qaStatus: string;
    scheduleDepth?: "verified" | "preview";
  },
>(
  rows: T[],
  options: ListSupportedVehiclesOptions = {},
): T[] => {
  const make = options.make ? normalizeSearch(options.make) : "";
  const model = options.model ? normalizeSearch(options.model) : "";
  const year = options.year;
  const q = options.q ? normalizeSearch(options.q) : "";

  let filtered = rows.filter((row) => {
    if (!options.verifiedOnly) return true;
    if (row.qaStatus !== "auto_verified") return false;
    const depth = row.scheduleDepth ?? resolveScheduleDepthForPack(row.packId);
    return depth === "verified";
  });

  if (make) filtered = filtered.filter((row) => normalizeSearch(row.make) === make);
  if (model) filtered = filtered.filter((row) => normalizeSearch(row.model) === model);
  if (year && Number.isFinite(year)) filtered = filtered.filter((row) => row.year === year);
  if (q) {
    filtered = filtered.filter((row) => {
      const haystack = [
        row.make,
        row.model,
        String(row.year),
        row.trim,
        row.powertrain ?? "",
        row.packId,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  const offset = Math.max(0, options.offset ?? 0);
  const limit = options.limit && options.limit > 0 ? options.limit : undefined;
  if (limit) return filtered.slice(offset, offset + limit);
  return filtered.slice(offset);
};

export const assertVehicleCreateAllowed = (input: {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
}):
  | { ok: true; packId: string }
  | { ok: false; status: 400 | 422; body: Record<string, unknown> } => {
  const year = input.year;
  const make = input.make?.trim() ?? "";
  const model = input.model?.trim() ?? "";
  const trim = input.trim?.trim() ?? "";

  if (!year || !Number.isFinite(year) || !make || !model || !trim) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "year, make, model, and trim are required",
        code: "vehicle_incomplete",
      },
    };
  }

  const packId = resolvePackIdForVehicle({ make, model, year, trim });
  if (!packId) {
    return {
      ok: false,
      status: 422,
      body: {
        error:
          "This vehicle is not in the early-access catalog yet. Request it in the app and we will email you when it is ready.",
        code: "waitlist_required",
        waitlistEligible: true,
        packId: null,
        qaStatus: null,
      },
    };
  }

  const catalog = loadSupportedVehicleCatalog();
  const catalogRow = catalog.vehicles.find((row) => row.packId === packId);
  if (!catalogRow || catalogRow.qaStatus !== "auto_verified") {
    return {
      ok: false,
      status: 422,
      body: {
        error:
          "This vehicle pack is still in review. Pick a verified model from the catalog or request your trim in the app.",
        code: "waitlist_required",
        waitlistEligible: true,
        packId,
        qaStatus: catalogRow?.qaStatus ?? null,
      },
    };
  }

  return { ok: true, packId };
};

export const checkVehicleSupport = (query: VehicleSupportQuery = {}): JsonResponse => {
  const year = Number(query.year);
  const make = query.make?.trim() ?? "";
  const model = query.model?.trim() ?? "";
  const trim = query.trim?.trim() ?? "";

  if (!Number.isFinite(year) || year < 1980 || !make || !model) {
    return jsonResponse(400, {
      error: "year, make, and model are required",
    });
  }

  const packId = resolvePackIdForVehicle({ make, model, year, trim });
  if (!packId) {
    return jsonResponse(200, {
      supported: false,
      waitlist: true,
      packId: null,
      qaStatus: null,
    });
  }

  const catalog = loadSupportedVehicleCatalog();
  const catalogRow = catalog.vehicles.find((row) => row.packId === packId);
  const qaStatus = catalogRow?.qaStatus ?? null;
  const supported = qaStatus === "auto_verified";

  return jsonResponse(200, {
    supported,
    waitlist: !supported,
    packId,
    qaStatus,
    supportTier: catalogRow?.supportTier ?? null,
  });
};

export const listSupportedVehicles = (
  options: ListSupportedVehiclesOptions = {},
) => {
  const catalog = loadSupportedVehicleCatalog();
  const rows = filterSupportedVehicleRows(catalog.vehicles, options);
  const registryByPackId = getTier2000SourceByPackId();

  return jsonResponse(200, {
    vehicles: rows.map((row) => ({
      packId: row.packId,
      make: row.make,
      model: row.model,
      year: row.year,
      trim: row.trim,
      powertrain: row.powertrain ?? null,
      supported: row.qaStatus === "auto_verified",
      qaStatus: row.qaStatus,
      supportTier: row.supportTier,
      scheduleSourceLine: resolveScheduleSourceLineForPack(
        row.packId,
        catalog.vehicles,
        registryByPackId,
      ),
      scheduleDepth: row.scheduleDepth ?? resolveScheduleDepthForPack(row.packId),
    })),
    total: filterSupportedVehicleRows(catalog.vehicles, {
      ...options,
      limit: undefined,
      offset: undefined,
    }).length,
  });
};

/** Test-only — reset tier-2000 singleton between vitest cases. */
export const __resetCatalogHandlerCachesForTests = (): void => {
  tier2000SourceByPackId = null;
  tier2000SourceLoadFailed = false;
};
