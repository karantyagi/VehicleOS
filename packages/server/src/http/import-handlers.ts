import type { VehicleOsImportService } from "@vehicleos/domain";
import type { ApiServices } from "../services/index.js";
import { jsonResponse, type JsonResponse } from "./json-response.js";
import { buildVehicleStateView } from "./vehicle-state-view.js";

type VehicleOsImportBody = {
  version?: "1";
  source?: string;
  exportedAt?: string;
  vehicle?: {
    currentMileage?: number;
  };
  services?: VehicleOsImportService[];
};

type AuthContext = {
  userId: string;
};

const unauthorized = (): JsonResponse => jsonResponse(401, { error: "Unauthorized" });

const forbidden = (): JsonResponse => jsonResponse(403, { error: "Forbidden" });

export const submitVehicleOsImport = async (
  services: ApiServices,
  vehicleId: string,
  body: VehicleOsImportBody,
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();

  const vehicle = await services.vehicles.findById(vehicleId);
  if (!vehicle) return jsonResponse(404, { error: "Vehicle not found" });
  if (vehicle.userId !== auth.userId) return forbidden();

  const importServices = body.services ?? [];
  if (importServices.length === 0) {
    return jsonResponse(400, { error: "services array is required" });
  }

  for (const [index, service] of importServices.entries()) {
    if (!service.serviceDate?.trim()) {
      return jsonResponse(400, { error: `services[${index}].serviceDate is required` });
    }
    if (!Number.isFinite(service.mileage)) {
      return jsonResponse(400, { error: `services[${index}].mileage is required` });
    }
    if (!Array.isArray(service.lineItems) || service.lineItems.length === 0) {
      return jsonResponse(400, { error: `services[${index}].lineItems is required` });
    }
  }

  const importResult = await services.goldenPath.importVehicleOsHistory({
    vehicleId,
    importSource: body.source?.trim() || "vehicleos-import",
    services: importServices,
  });

  const nextMileage = body.vehicle?.currentMileage;
  const shouldUpdateMileage =
    typeof nextMileage === "number" &&
    Number.isFinite(nextMileage) &&
    nextMileage > vehicle.currentMileage;
  const updatedVehicle = shouldUpdateMileage
    ? await services.vehicles.update(vehicleId, auth.userId, { currentMileage: nextMileage })
    : vehicle;

  const view = buildVehicleStateView(importResult.state, updatedVehicle ?? vehicle);

  return jsonResponse(201, {
    importedCount: importResult.importedCount,
    importSource: body.source?.trim() || "vehicleos-import",
    timeline: view.timeline,
    maintenanceSchedule: view.maintenanceSchedule,
  });
};
