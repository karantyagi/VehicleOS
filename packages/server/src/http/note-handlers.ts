import type { ServiceRecordSource } from "@vehicleos/domain";
import type { ApiServices } from "../services/index.js";
import { jsonResponse, type JsonResponse } from "./json-response.js";
import { buildVehicleStateView } from "./vehicle-state-view.js";

type OwnerNoteBody = {
  shop?: string;
  serviceDate: string;
  mileage: number;
  lineItems?: string[];
  total?: string;
  source?: Extract<ServiceRecordSource, "owner_note" | "dealer">;
  note?: string;
};

type AuthContext = {
  userId: string;
};

const unauthorized = (): JsonResponse => jsonResponse(401, { error: "Unauthorized" });

const forbidden = (): JsonResponse => jsonResponse(403, { error: "Forbidden" });

export const submitOwnerServiceNote = async (
  services: ApiServices,
  vehicleId: string,
  body: OwnerNoteBody,
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();

  const vehicle = await services.vehicles.findById(vehicleId);
  if (!vehicle) return jsonResponse(404, { error: "Vehicle not found" });
  if (vehicle.userId !== auth.userId) return forbidden();

  if (!body.serviceDate?.trim()) {
    return jsonResponse(400, { error: "serviceDate is required" });
  }

  if (!Number.isFinite(body.mileage)) {
    return jsonResponse(400, { error: "mileage is required" });
  }

  const lineItems = body.lineItems?.map((line) => line.trim()).filter(Boolean) ?? [];
  if (lineItems.length === 0 && body.note?.trim()) {
    lineItems.push(body.note.trim());
  }

  if (lineItems.length === 0) {
    return jsonResponse(400, { error: "Add at least one line item or note" });
  }

  const source = body.source === "dealer" ? "dealer" : "owner_note";
  const shop =
    body.shop?.trim() ||
    (source === "dealer" ? "Dealer service" : "Owner noted");

  const result = await services.goldenPath.confirmService({
    vehicleId,
    shop,
    serviceDate: body.serviceDate,
    mileage: body.mileage,
    lineItems,
    total: body.total?.trim() || "$0.00",
    evidenceIds: [],
    source,
  });

  if (result.conflict) {
    return jsonResponse(409, {
      conflict: true,
      conflictId: result.conflictId,
      verificationTask: {
        taskId: result.taskId,
        title: result.state.nowQueue.at(-1)?.title,
        reason: result.state.nowQueue.at(-1)?.reason,
        verificationCode: result.state.nowQueue.at(-1)?.verificationCode,
      },
      ...buildVehicleStateView(result.state),
    });
  }

  return jsonResponse(201, {
    recommendation: result.result.recommendation,
    task: result.result.task,
    ...buildVehicleStateView(result.result.state),
  });
};
