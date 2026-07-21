import { analyzeDealerQuote, recordQuoteAnalysis } from "@vehicleos/domain";
import type { ApiServices } from "../services/index.js";
import { jsonResponse, type JsonResponse } from "./json-response.js";

type QuoteBody = {
  rawText: string;
};

type AuthContext = {
  userId: string;
};

const unauthorized = (): JsonResponse => jsonResponse(401, { error: "Unauthorized" });

const forbidden = (): JsonResponse => jsonResponse(403, { error: "Forbidden" });

export const analyzeQuote = async (
  services: ApiServices,
  vehicleId: string,
  body: QuoteBody,
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();

  const vehicle = await services.vehicles.findById(vehicleId);
  if (!vehicle) return jsonResponse(404, { error: "Vehicle not found" });
  if (vehicle.userId !== auth.userId) return forbidden();

  const rawText = body.rawText?.trim();
  if (!rawText) return jsonResponse(400, { error: "rawText is required" });

  const analysis = analyzeDealerQuote({ rawText });
  const recorded = await recordQuoteAnalysis({
    eventStore: services.eventStore,
    vehicleId,
    rawText,
    analysis,
  });

  return jsonResponse(201, {
    analysis: recorded,
  });
};
