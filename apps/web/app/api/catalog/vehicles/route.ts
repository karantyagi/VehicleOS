import { NextResponse } from "next/server";
import { listSupportedVehicles } from "@vehicleos/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const verifiedOnly = new URL(request.url).searchParams.get("verifiedOnly") === "true";
    const result = listSupportedVehicles({ verifiedOnly });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("catalog/vehicles failed", error);
    return NextResponse.json(
      { error: "Could not load supported vehicle catalog.", code: "catalog_load_failed" },
      { status: 500 },
    );
  }
}
