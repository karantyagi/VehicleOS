import type { ServiceRecordPatch } from "@vehicleos/domain";
import { updateServiceRecord } from "@vehicleos/domain";
import type { ApiServices } from "../services/index.js";
import { jsonResponse, type JsonResponse } from "./json-response.js";
import { buildVehicleStateView } from "./vehicle-state-view.js";

type AuthContext = {
  userId: string;
};

type UpdateServiceBody = ServiceRecordPatch;

const unauthorized = (): JsonResponse => jsonResponse(401, { error: "Unauthorized" });

const forbidden = (): JsonResponse => jsonResponse(403, { error: "Forbidden" });

export const updateVehicleService = async (
  services: ApiServices,
  vehicleId: string,
  serviceId: string,
  body: UpdateServiceBody,
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();

  const vehicle = await services.vehicles.findById(vehicleId);
  if (!vehicle) return jsonResponse(404, { error: "Vehicle not found" });
  if (vehicle.userId !== auth.userId) return forbidden();

  if (body.lineItems !== undefined) {
    const lineItems = body.lineItems.map((line) => line.trim()).filter(Boolean);
    if (lineItems.length === 0) {
      return jsonResponse(400, { error: "At least one line item is required." });
    }
    body = { ...body, lineItems };
  }

  if (body.mileage !== undefined && !Number.isFinite(body.mileage)) {
    return jsonResponse(400, { error: "mileage must be a number." });
  }

  try {
    const result = await updateServiceRecord({
      eventStore: services.eventStore,
      input: {
        vehicleId,
        serviceId,
        patch: body,
      },
    });

    const view = buildVehicleStateView(result.state, vehicle);
    return jsonResponse(200, {
      timeline: view.timeline,
      currentMileage: view.currentMileage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update service record.";
    if (message.includes("not found")) {
      return jsonResponse(404, { error: message });
    }
    return jsonResponse(400, { error: message });
  }
};
