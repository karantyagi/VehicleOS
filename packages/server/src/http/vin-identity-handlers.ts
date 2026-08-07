import { resolveSupportedVehicleIdentity } from "@vehicleos/knowledge";
import { jsonResponse, type JsonResponse } from "./json-response.js";

const VPIC_DECODE_TIMEOUT_MS = 3_000;
const fullVinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;

type VpicResult = {
  Make?: unknown;
  Model?: unknown;
  ModelYear?: unknown;
  Trim?: unknown;
  DriveType?: unknown;
};

type VpicResponse = {
  Results?: unknown;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type VinIdentityDecodeBody =
  | {
      status: "supported";
      provider: "nhtsa_vpic";
      vehicle: {
        make: string;
        model: string;
        year: number;
        trim: string | null;
        driveType: string | null;
      };
      canonicalVehicle: {
        make: string;
        model: string;
        year: number;
      };
      matchingScheduleCount: number;
    }
  | {
      status: "unsupported";
      provider: "nhtsa_vpic";
      vehicle: {
        make: string;
        model: string;
        year: number;
        trim: string | null;
        driveType: string | null;
      };
      matchingScheduleCount: 0;
    }
  | {
      status: "unavailable";
      provider: "nhtsa_vpic";
    };

export const normalizeVinForLookup = (value: string): string =>
  value.replace(/[\s-]+/g, "").toUpperCase();

export const isFullVin = (value: string): boolean => fullVinPattern.test(normalizeVinForLookup(value));

const nonBlankString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || /^(not applicable|unknown|n\/a)$/i.test(trimmed)) return null;
  return trimmed;
};

const firstVpicResult = (payload: unknown): VpicResult | null => {
  if (!payload || typeof payload !== "object") return null;
  const results = (payload as VpicResponse).Results;
  if (!Array.isArray(results) || !results[0] || typeof results[0] !== "object") return null;
  return results[0] as VpicResult;
};

/**
 * Decode a full VIN through the public NHTSA vPIC service. The VIN is neither
 * logged nor persisted here; NHTSA vehicle facts only narrow the owner's
 * verified-schedule choices and never select a trim or pack automatically.
 */
export const decodeVinIdentity = async (
  vinInput: string,
  options: { fetchImpl?: FetchLike; timeoutMs?: number } = {},
): Promise<JsonResponse<VinIdentityDecodeBody | { error: string; code: "vin_invalid" }>> => {
  const vin = normalizeVinForLookup(vinInput);
  if (!fullVinPattern.test(vin)) {
    return jsonResponse(400, {
      error: "Enter a valid 17-character VIN to identify your vehicle.",
      code: "vin_invalid" as const,
    });
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? VPIC_DECODE_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetchImpl(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(vin)}?format=json`,
      {
        cache: "no-store",
        signal: controller.signal,
      },
    );
  } catch {
    return jsonResponse(200, { status: "unavailable", provider: "nhtsa_vpic" });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    return jsonResponse(200, { status: "unavailable", provider: "nhtsa_vpic" });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return jsonResponse(200, { status: "unavailable", provider: "nhtsa_vpic" });
  }

  const result = firstVpicResult(payload);
  const make = nonBlankString(result?.Make);
  const model = nonBlankString(result?.Model);
  const year = Number(nonBlankString(result?.ModelYear));
  if (!make || !model || !Number.isInteger(year) || year < 1886) {
    return jsonResponse(200, { status: "unavailable", provider: "nhtsa_vpic" });
  }

  const vehicle = {
    make,
    model,
    year,
    trim: nonBlankString(result?.Trim),
    driveType: nonBlankString(result?.DriveType),
  };
  const resolution = resolveSupportedVehicleIdentity({
    source: "nhtsa_vpic",
    make,
    model,
    year,
  });

  if (!resolution.canonical || resolution.candidates.length === 0) {
    return jsonResponse(200, {
      status: "unsupported",
      provider: "nhtsa_vpic",
      vehicle,
      matchingScheduleCount: 0,
    });
  }

  return jsonResponse(200, {
    status: "supported",
    provider: "nhtsa_vpic",
    vehicle,
    canonicalVehicle: resolution.canonical,
    matchingScheduleCount: resolution.candidates.length,
  });
};
