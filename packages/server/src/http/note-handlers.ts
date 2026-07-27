import { mergeReceiptExtractWithHints, recordOwnershipFromServiceNote } from "@vehicleos/domain";
import type { IngestChannel, ServiceRecordSource } from "@vehicleos/domain";
import type { ApiServices } from "../services/index.js";
import { jsonResponse, type JsonResponse } from "./json-response.js";
import { recommendationContextFromVehicle } from "./recommendation-context-from-vehicle.js";
import { vehicleStateOptionsFromVehicle } from "./vehicle-state-options-from-vehicle.js";
import { buildVehicleStateView } from "./vehicle-state-view.js";

type OwnerNoteBody = {
  shop?: string;
  shopLocation?: string;
  serviceDate: string;
  mileage: number;
  lineItems?: string[];
  total?: string;
  source?: Extract<ServiceRecordSource, "owner_note" | "dealer" | "receipt" | "voice">;
  note?: string;
  storageKey?: string;
  channel?: IngestChannel;
  voiceTranscript?: string;
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
  const ownerNote = body.note?.trim() || body.voiceTranscript?.trim();
  if (ownerNote) {
    const prefixed = ownerNote.startsWith("Note:") ? ownerNote : `Note: ${ownerNote}`;
    if (!lineItems.some((line) => line.toLowerCase() === prefixed.toLowerCase())) {
      lineItems.push(prefixed);
    }
  }

  if (lineItems.length === 0) {
    return jsonResponse(400, { error: "Add at least one line item or note" });
  }

  let source: ServiceRecordSource = "owner_note";
  if (body.source === "dealer") source = "dealer";
  else if (body.source === "receipt") source = "receipt";
  else if (body.source === "voice") source = "voice";

  const shop =
    body.shop?.trim() ||
    (source === "dealer" ? "Dealer service" : source === "voice" ? "Voice note" : "Owner noted");

  let evidenceIds: string[] = [];
  let documentId: string | undefined;
  let correlationId: string | undefined;

  const hintText = [body.note, body.voiceTranscript, ...lineItems].filter(Boolean).join("\n");

  if (body.storageKey?.trim()) {
    const channel = body.channel ?? (source === "voice" ? "voice" : "receipt_upload");
    const extractResult = await services.goldenPath.queueReceiptExtract({
      vehicleId,
      storageKey: body.storageKey.trim(),
      channel,
      hintText,
      shop,
      serviceDate: body.serviceDate,
      mileage: body.mileage,
      lineItems,
      total: body.total?.trim(),
    });

    if (extractResult.queued) {
      return jsonResponse(202, {
        queued: true,
        documentId: extractResult.documentId,
        message: "Receipt queued for assistant extraction (ENG-2 worker). Confirm fields manually for now.",
      });
    }

    documentId = extractResult.documentId;
    correlationId = extractResult.correlationId;
    evidenceIds = [documentId];

    const merged = mergeReceiptExtractWithHints(extractResult.extracted, {
      shop,
      serviceDate: body.serviceDate,
      mileage: body.mileage,
      lineItems,
      total: body.total?.trim(),
    });

    if (merged.lineItems.length > 0) {
      lineItems.splice(0, lineItems.length, ...merged.lineItems);
    }
  }

  const result = await services.goldenPath.confirmService({
    vehicleId,
    shop,
    shopLocation: body.shopLocation?.trim() || undefined,
    serviceDate: body.serviceDate,
    mileage: body.mileage,
    lineItems,
    total: body.total?.trim() || "$0.00",
    evidenceIds,
    documentId,
    correlationId,
    source,
    ...recommendationContextFromVehicle(vehicle),
  });

  if (!result.conflict) {
    await recordOwnershipFromServiceNote({
      eventStore: services.eventStore,
      input: {
        vehicleId,
        lineItems,
        recordDate: body.serviceDate,
        mileage: body.mileage,
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
      conflictId: result.conflictId,
      verificationTask: {
        taskId: result.taskId,
        title: view.nowQueue.at(-1)?.title,
        reason: view.nowQueue.at(-1)?.reason,
        verificationCode: view.nowQueue.at(-1)?.verificationCode,
      },
      ...view,
    });
  }

  return jsonResponse(result.result.skippedDuplicate ? 200 : 201, {
    duplicateSkipped: result.result.skippedDuplicate ?? false,
    recommendation: result.result.recommendation,
    task: result.result.task,
    ...view,
  });
};
