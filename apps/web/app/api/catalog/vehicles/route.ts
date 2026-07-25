import { NextResponse } from "next/server";
import { listSupportedVehicles } from "@vehicleos/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const verifiedOnly = new URL(request.url).searchParams.get("verifiedOnly") === "true";
  const result = listSupportedVehicles({ verifiedOnly });
  return NextResponse.json(result.body, { status: result.status });
}
