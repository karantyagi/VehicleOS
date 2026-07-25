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

export const listSupportedVehicles = (): JsonResponse => {
  const catalog = loadSupportedVehicleCatalog();
  return jsonResponse(200, {
    vehicles: catalog.vehicles.map((row) => ({
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
