import { NextResponse } from "next/server";
import { getVehicle } from "@vehicleos/server";
import { toAuthContext } from "../../../../lib/auth/api-context";
import { getSessionUser } from "../../../../lib/auth/session";
import { getServices } from "../../../../lib/api-services";

export const runtime = "nodejs";

type RouteContext = { params: { vehicleId: string } };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  const result = await getVehicle(getServices(), context.params.vehicleId, toAuthContext(user));
  return NextResponse.json(result.body, { status: result.status });
}
