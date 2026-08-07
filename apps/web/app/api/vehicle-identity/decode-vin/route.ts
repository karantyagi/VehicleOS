import { NextResponse } from "next/server";
import { decodeVinIdentity } from "@vehicleos/server";
import { getSessionUser } from "../../../../lib/auth/session";

export const runtime = "nodejs";

/**
 * Authenticated proxy for the public NHTSA decoder. Keep raw VINs server-side
 * and out of browser telemetry, URLs, and application logs.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { vin?: unknown };
  const result = await decodeVinIdentity(typeof body.vin === "string" ? body.vin : "");
  return NextResponse.json(result.body, { status: result.status });
}
