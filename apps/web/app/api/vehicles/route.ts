import { NextResponse } from "next/server";
import { createVehicle } from "@vehicleos/server";
import { toAuthContext } from "../../../lib/auth/api-context";
import { getSessionUser } from "../../../lib/auth/session";
import { getServices } from "../../../lib/api-services";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSessionUser();
  const auth = toAuthContext(user);
  const body = (await request.json()) as Record<string, unknown>;
  const result = await createVehicle(getServices(), body, auth);
  return NextResponse.json(result.body, { status: result.status });
}
