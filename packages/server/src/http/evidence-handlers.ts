import type { ApiServices } from "../services/index.js";
import {
  findDocumentEvidence,
  isStorageKeyOwnedByUser,
} from "../evidence/find-document-evidence.js";
import { jsonResponse, type JsonResponse } from "./json-response.js";

type AuthContext = {
  userId: string;
};

const unauthorized = (): JsonResponse => jsonResponse(401, { error: "Unauthorized" });

const forbidden = (): JsonResponse => jsonResponse(403, { error: "Forbidden" });

const loadVehicleEvents = async (services: ApiServices, vehicleId: string) => {
  const eventStore = services.eventStore;
  if ("loadForVehicle" in eventStore && typeof eventStore.loadForVehicle === "function") {
    return eventStore.loadForVehicle(vehicleId);
  }

  const allEvents = await eventStore.loadAll();
  return allEvents.filter(
    (event) => "vehicleId" in event.payload && event.payload.vehicleId === vehicleId,
  );
};

export const getEvidenceAccessUrl = async (
  services: ApiServices,
  vehicleId: string,
  documentId: string,
  auth?: AuthContext,
  deps?: {
    createSignedUrl?: (input: {
      storageKey: string;
    }) => Promise<{ signedUrl: string; expiresInSeconds: number } | null>;
  },
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();

  const vehicle = await services.vehicles.findById(vehicleId);
  if (!vehicle) return jsonResponse(404, { error: "Vehicle not found" });
  if (vehicle.userId !== auth.userId) return forbidden();

  const events = await loadVehicleEvents(services, vehicleId);
  const evidence = findDocumentEvidence(events, documentId);
  if (!evidence) return jsonResponse(404, { error: "Evidence not found" });

  if (!isStorageKeyOwnedByUser(evidence.storageKey, auth.userId, vehicleId)) {
    return forbidden();
  }

  const createSignedUrl = deps?.createSignedUrl;
  if (!createSignedUrl) {
    return jsonResponse(200, {
      documentId,
      storageKey: evidence.storageKey,
      channel: evidence.channel,
      ingestedAt: evidence.ingestedAt,
      immutable: true,
      available: false,
      reason: "Signed URLs require hosted storage configuration",
    });
  }

  const signed = await createSignedUrl({ storageKey: evidence.storageKey });
  if (!signed) {
    return jsonResponse(503, { error: "Could not create signed URL" });
  }

  return jsonResponse(200, {
    documentId,
    storageKey: evidence.storageKey,
    channel: evidence.channel,
    ingestedAt: evidence.ingestedAt,
    immutable: true,
    available: true,
    signedUrl: signed.signedUrl,
    expiresInSeconds: signed.expiresInSeconds,
  });
};
