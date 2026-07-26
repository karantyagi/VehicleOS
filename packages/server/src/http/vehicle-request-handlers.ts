import { randomUUID } from "node:crypto";
import { jsonResponse, type JsonResponse } from "./json-response.js";
import { sendVehicleRequestOpsEmail } from "./vehicle-request-notify.js";

export type VehicleRequestInput = {
  year: number;
  make: string;
  model: string;
  trim: string;
  note?: string;
  contactEmail: string;
  source?: string;
  userId?: string;
};

export type VehicleRequestContactPreview = {
  contactEmail: string | null;
};

const MIN_YEAR = 1980;
const MAX_YEAR = new Date().getFullYear() + 1;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeText = (value: string | undefined): string => value?.trim() ?? "";

export const resolveVehicleRequestContactEmail = (input: {
  sessionEmail?: string | null;
  bodyEmail?: string | null;
}): string | null => {
  const bodyEmail = normalizeText(input.bodyEmail ?? undefined);
  if (bodyEmail && EMAIL_PATTERN.test(bodyEmail)) return bodyEmail;

  const sessionEmail = normalizeText(input.sessionEmail ?? undefined);
  if (sessionEmail && EMAIL_PATTERN.test(sessionEmail)) return sessionEmail;

  return null;
};

export const previewVehicleRequestContact = (sessionEmail?: string | null): JsonResponse => {
  return jsonResponse(200, {
    contactEmail: resolveVehicleRequestContactEmail({ sessionEmail }),
  } satisfies VehicleRequestContactPreview);
};

export const validateVehicleRequestInput = (
  input: Partial<VehicleRequestInput>,
): { ok: true; value: VehicleRequestInput } | { ok: false; status: number; body: Record<string, unknown> } => {
  const year = Number(input.year);
  const make = normalizeText(input.make);
  const model = normalizeText(input.model);
  const trim = normalizeText(input.trim);
  const note = normalizeText(input.note);
  const contactEmail = normalizeText(input.contactEmail);

  if (!Number.isFinite(year) || year < MIN_YEAR || year > MAX_YEAR) {
    return {
      ok: false,
      status: 400,
      body: { error: `Enter a model year between ${MIN_YEAR} and ${MAX_YEAR}.`, code: "invalid_year" },
    };
  }

  if (!make || !model || !trim) {
    return {
      ok: false,
      status: 400,
      body: { error: "Make, model, and trim are required.", code: "vehicle_incomplete" },
    };
  }

  if (!contactEmail || !EMAIL_PATTERN.test(contactEmail)) {
    return {
      ok: false,
      status: 400,
      body: { error: "Add a valid email so the VehicleOS team can reply.", code: "contact_email_required" },
    };
  }

  if (note.length > 500) {
    return {
      ok: false,
      status: 400,
      body: { error: "Keep your note under 500 characters.", code: "note_too_long" },
    };
  }

  return {
    ok: true,
    value: {
      year,
      make,
      model,
      trim,
      note: note || undefined,
      contactEmail,
      source: normalizeText(input.source) || "app",
      userId: normalizeText(input.userId) || undefined,
    },
  };
};

const postVehicleRequestWebhook = async (payload: Record<string, unknown>): Promise<void> => {
  const webhookUrl = process.env.VEHICLEOS_VEHICLE_REQUEST_WEBHOOK_URL?.trim();
  if (!webhookUrl) return;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`vehicle request webhook failed (${response.status})`);
  }
};

export const submitVehicleRequest = async (
  input: Partial<VehicleRequestInput>,
): Promise<JsonResponse> => {
  const validated = validateVehicleRequestInput(input);
  if (!validated.ok) {
    return jsonResponse(validated.status, validated.body);
  }

  const requestId = randomUUID();
  const payload = {
    type: "vehicle_request",
    requestId,
    createdAt: new Date().toISOString(),
    ...validated.value,
  };

  console.info("[vehicle-request]", JSON.stringify(payload));

  try {
    await sendVehicleRequestOpsEmail(payload);
  } catch (error) {
    console.error("[vehicle-request] ops email failed", error);
  }

  try {
    await postVehicleRequestWebhook(payload);
  } catch (error) {
    console.error("[vehicle-request] webhook delivery failed", error);
  }

  return jsonResponse(201, {
    requestId,
    message: "Request received — the VehicleOS team will follow up by email.",
  });
};
