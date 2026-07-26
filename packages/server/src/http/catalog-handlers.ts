import {
  loadSupportedVehicleCatalog,
  resolvePackIdForVehicle,
} from "@vehicleos/knowledge";
import { jsonResponse, type JsonResponse } from "./json-response.js";

export type VehicleSupportQuery = {
  year?: string | number;
  make?: string;
  model?: string;
  trim?: string;
};

export type ListSupportedVehiclesOptions = {
  verifiedOnly?: boolean;
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
): JsonResponse => {
  const catalog = loadSupportedVehicleCatalog();
  const rows = catalog.vehicles.filter(
    (row) => !options.verifiedOnly || row.qaStatus === "auto_verified",
  );

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
    })),
  });
};
