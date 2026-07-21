import {
  recordKnowledgeSchedule,
  stubExtractManualSchedule,
  StubPolicyEngine,
  type ManualScheduleDraftRow,
} from "@vehicleos/domain";
import type { ApiServices } from "../services/index.js";
import { jsonResponse, type JsonResponse } from "./json-response.js";

type PreviewBody = {
  year?: number;
  make?: string;
  model?: string;
};

type ConfirmBody = {
  storageKey: string;
  manualTitle: string;
  entries: ManualScheduleDraftRow[];
};

type AuthContext = {
  userId: string;
};

const unauthorized = (): JsonResponse => jsonResponse(401, { error: "Unauthorized" });

const forbidden = (): JsonResponse => jsonResponse(403, { error: "Forbidden" });

export const previewManualSchedule = async (
  services: ApiServices,
  vehicleId: string,
  body: PreviewBody = {},
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();

  const vehicle = await services.vehicles.findById(vehicleId);
  if (!vehicle) return jsonResponse(404, { error: "Vehicle not found" });
  if (vehicle.userId !== auth.userId) return forbidden();

  const draft = stubExtractManualSchedule({
    year: body.year ?? vehicle.year,
    make: body.make ?? vehicle.make,
    model: body.model ?? vehicle.model,
  });

  return jsonResponse(200, { draft });
};

export const confirmManualSchedule = async (
  services: ApiServices,
  vehicleId: string,
  body: ConfirmBody,
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();

  const vehicle = await services.vehicles.findById(vehicleId);
  if (!vehicle) return jsonResponse(404, { error: "Vehicle not found" });
  if (vehicle.userId !== auth.userId) return forbidden();

  if (!body.storageKey) {
    return jsonResponse(400, { error: "storageKey is required — upload your OEM manual PDF first" });
  }

  if (!body.manualTitle?.trim()) {
    return jsonResponse(400, { error: "manualTitle is required" });
  }

  if (!body.entries || body.entries.length === 0) {
    return jsonResponse(400, { error: "entries are required — confirm at least one schedule row" });
  }

  const result = await recordKnowledgeSchedule({
    eventStore: services.eventStore,
    policyEngine: new StubPolicyEngine(),
    vehicleId,
    storageKey: body.storageKey,
    manualTitle: body.manualTitle.trim(),
    entries: body.entries,
    currentMileage: vehicle.currentMileage,
  });

  return jsonResponse(201, result);
};
