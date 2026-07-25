import { NextResponse } from "next/server";
import { checkVehicleSupport, listSupportedVehicles } from "@vehicleos/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = checkVehicleSupport({
    year: searchParams.get("year") ?? undefined,
    make: searchParams.get("make") ?? undefined,
    model: searchParams.get("model") ?? undefined,
    trim: searchParams.get("trim") ?? undefined,
  });

  return NextResponse.json(result.body, { status: result.status });
}
