import { NextResponse } from "next/server";
import { listSupportedVehicles } from "@vehicleos/server";

export const runtime = "nodejs";

const parsePositiveInt = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const verifiedOnly = params.get("verifiedOnly") === "true";
    const make = params.get("make") ?? undefined;
    const model = params.get("model") ?? undefined;
    const q = params.get("q") ?? undefined;
    const year = Number.parseInt(params.get("year") ?? "", 10);
    const result = listSupportedVehicles({
      verifiedOnly,
      make,
      model,
      q,
      year: Number.isFinite(year) ? year : undefined,
      limit: parsePositiveInt(params.get("limit")),
      offset: parsePositiveInt(params.get("offset")),
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("catalog/vehicles failed", error);
    return NextResponse.json(
      { error: "Could not load supported vehicle catalog.", code: "catalog_load_failed" },
      { status: 500 },
    );
  }
}
