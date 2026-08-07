import { parseVoiceServiceNote, recordOwnershipFromServiceNote } from "@vehicleos/domain";
import type { ApiServices } from "../services/index.js";
import { jsonResponse, type JsonResponse } from "./json-response.js";
import { recommendationContextFromVehicle } from "./recommendation-context-from-vehicle.js";
import { vehicleStateOptionsFromVehicle } from "./vehicle-state-options-from-vehicle.js";
import { buildVehicleStateView } from "./vehicle-state-view.js";

type VoiceBody = {
  transcript: string;
  storageKey: string;
  captureChannel?: "text" | "voice";
  shop?: string;
  serviceDate?: string;
  mileage?: number;
  lineItems?: string[];
  total?: string;
};

type AuthContext = {
  userId: string;
};

const unauthorized = (): JsonResponse => jsonResponse(401, { error: "Unauthorized" });

const forbidden = (): JsonResponse => jsonResponse(403, { error: "Forbidden" });

export const submitVoiceMemory = async (
  services: ApiServices,
  vehicleId: string,
  body: VoiceBody,
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();

  const vehicle = await services.vehicles.findById(vehicleId);
  if (!vehicle) return jsonResponse(404, { error: "Vehicle not found" });
  if (vehicle.userId !== auth.userId) return forbidden();

  const transcript = body.transcript?.trim();
  if (!transcript) return jsonResponse(400, { error: "transcript is required" });
  if (!body.storageKey) {
    return jsonResponse(400, { error: "storageKey is required - save the service note first" });
  }

  const captureChannel = body.captureChannel ?? "voice";
  if (captureChannel !== "text" && captureChannel !== "voice") {
    return jsonResponse(400, { error: "captureChannel must be text or voice" });
  }

  const parsed = parseVoiceServiceNote({
    transcript,
    defaultMileage: body.mileage ?? vehicle.currentMileage,
  });

  if (!parsed) {
    return jsonResponse(400, {
      error: "Could not parse voice note — include mileage or confirm fields manually",
    });
  }

  const extracted = {
    shop: body.shop?.trim() || parsed.shop,
    serviceDate: body.serviceDate || parsed.serviceDate,
    mileage: body.mileage ?? parsed.mileage,
    lineItems:
      body.lineItems && body.lineItems.length > 0 ? body.lineItems : parsed.lineItems,
    total: body.total?.trim() || parsed.total,
    confidence: parsed.confidence,
  };

  const { documentId, correlationId } = await services.goldenPath.ingestReceipt({
    vehicleId,
    storageKey: body.storageKey,
    channel: captureChannel === "voice" ? "voice" : "manual",
  });

  await services.goldenPath.completeExtraction({
    vehicleId,
    documentId,
    correlationId,
    extracted,
  });

  const result = await services.goldenPath.confirmService({
    vehicleId,
    shop: extracted.shop,
    serviceDate: extracted.serviceDate,
    mileage: extracted.mileage,
    lineItems: extracted.lineItems,
    total: extracted.total,
    evidenceIds: [documentId],
    documentId,
    correlationId,
    source: captureChannel === "voice" ? "voice" : "owner_note",
    ...recommendationContextFromVehicle(vehicle),
  });

  if (!result.conflict) {
    await recordOwnershipFromServiceNote({
      eventStore: services.eventStore,
      input: {
        vehicleId,
        lineItems: extracted.lineItems,
        recordDate: extracted.serviceDate,
        mileage: extracted.mileage,
      },
    });
  }

  const snapshot = await services.goldenPath.getVehicleState(
    vehicleId,
    vehicleStateOptionsFromVehicle(vehicle),
  );
  const view = buildVehicleStateView(snapshot.state, vehicle, snapshot.events);

  if (result.conflict) {
    return jsonResponse(409, {
      conflict: true,
      documentId,
      conflictId: result.conflictId,
      parsed: extracted,
      verificationTask: {
        taskId: result.taskId,
        title: view.nowQueue.at(-1)?.title,
        reason: view.nowQueue.at(-1)?.reason,
        verificationCode: view.nowQueue.at(-1)?.verificationCode,
      },
      timeline: view.timeline,
      nowQueue: view.nowQueue,
    });
  }

  return jsonResponse(result.result.skippedDuplicate ? 200 : 201, {
    documentId,
    captureChannel,
    duplicateSkipped: result.result.skippedDuplicate ?? false,
    parsed: extracted,
    transcript,
    recommendation: result.result.recommendation,
    task: result.result.task,
    timeline: view.timeline,
    nowQueue: view.nowQueue,
    ownerDueItems: view.ownerDueItems,
  });
};
