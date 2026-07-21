import { recordSeasonalPrompts, type ClimateZone } from "@vehicleos/domain";
import type { ApiServices } from "../services/index.js";
import { jsonResponse, type JsonResponse } from "./json-response.js";

type RefreshBody = {
  climateZone?: ClimateZone;
  referenceDate?: string;
};

type AuthContext = {
  userId: string;
};

const unauthorized = (): JsonResponse => jsonResponse(401, { error: "Unauthorized" });

const forbidden = (): JsonResponse => jsonResponse(403, { error: "Forbidden" });

const isClimateZone = (value: string | undefined): value is ClimateZone =>
  value === "cold" || value === "moderate" || value === "hot";

export const refreshSeasonalPrompts = async (
  services: ApiServices,
  vehicleId: string,
  body: RefreshBody = {},
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();

  const vehicle = await services.vehicles.findById(vehicleId);
  if (!vehicle) return jsonResponse(404, { error: "Vehicle not found" });
  if (vehicle.userId !== auth.userId) return forbidden();

  const climateZone = isClimateZone(body.climateZone) ? body.climateZone : "moderate";
  const result = await recordSeasonalPrompts({
    eventStore: services.eventStore,
    vehicleId,
    climateZone,
    referenceDate: body.referenceDate,
  });

  return jsonResponse(200, {
    climateZone,
    created: result.created,
    skippedRuleIds: result.skippedRuleIds,
    nowQueue: result.nowQueue,
  });
};
