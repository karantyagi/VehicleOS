import { recordOwnerDriverLicense } from "@vehicleos/domain";
import type { ApiServices } from "../services/index.js";
import { jsonResponse, type JsonResponse } from "./json-response.js";

type AuthContext = { userId: string };

type OwnerDriverLicenseBody = {
  recordId?: string;
  jurisdiction?: string;
  agency?: string;
  expirationDate?: string;
  description?: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isValidIsoDate = (value: string): boolean => {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const saveOwnerDriverLicense = async (
  services: ApiServices,
  body: OwnerDriverLicenseBody,
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return jsonResponse(401, { error: "Unauthorized" });

  const jurisdiction = body.jurisdiction?.trim();
  const expirationDate = body.expirationDate?.trim();
  if (!jurisdiction) return jsonResponse(400, { error: "Jurisdiction is required." });
  if (!expirationDate || !isValidIsoDate(expirationDate)) {
    return jsonResponse(400, { error: "A valid expiration date is required." });
  }

  const agency = body.agency?.trim() || `${jurisdiction} licensing agency`;
  const records = await recordOwnerDriverLicense({
    eventStore: services.eventStore,
    ownerId: auth.userId,
    license: {
      ...(body.recordId?.trim() ? { recordId: body.recordId.trim() } : {}),
      agency,
      recordDate: new Date().toISOString().slice(0, 10),
      licenseClass: null,
      expirationDate,
      description: body.description?.trim() || `${jurisdiction} driver's license renewal`,
      details: [`Jurisdiction: ${jurisdiction}`, `Expiration Date: ${expirationDate}`],
      source: "owner_note",
    },
  });

  return jsonResponse(201, { records });
};
