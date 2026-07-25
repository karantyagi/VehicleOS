import { NextResponse } from "next/server";
import { listSupportedVehicles } from "@vehicleos/server";

export const runtime = "nodejs";

export async function GET() {
  const result = listSupportedVehicles();
  return NextResponse.json(result.body, { status: result.status });
}
