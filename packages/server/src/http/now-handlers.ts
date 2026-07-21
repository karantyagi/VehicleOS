import type { ApiServices } from "../services/index.js";
import { jsonResponse, type JsonResponse } from "./json-response.js";
import { buildVehicleStateView } from "./vehicle-state-view.js";

type AuthContext = {
  userId: string;
};

const unauthorized = (): JsonResponse => jsonResponse(401, { error: "Unauthorized" });

const forbidden = (): JsonResponse => jsonResponse(403, { error: "Forbidden" });

export const refreshNowQueue = async (
  services: ApiServices,
  vehicleId: string,
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();

  const vehicle = await services.vehicles.findById(vehicleId);
  if (!vehicle) return jsonResponse(404, { error: "Vehicle not found" });
  if (vehicle.userId !== auth.userId) return forbidden();

  const result = await services.goldenPath.refreshMaintenanceRecommendation({ vehicleId });

  return jsonResponse(200, {
    created: result.created,
    skippedReason: result.skippedReason,
    recommendation: result.recommendation,
    ...buildVehicleStateView(result.state),
  });
};
