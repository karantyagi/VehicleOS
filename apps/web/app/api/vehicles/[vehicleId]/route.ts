import { NextResponse } from "next/server";
import { deleteVehicle, getVehicle, updateVehicle } from "@vehicleos/server";
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

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  const body = (await request.json()) as Record<string, unknown>;
  const result = await updateVehicle(getServices(), context.params.vehicleId, body, toAuthContext(user));
  return NextResponse.json(result.body, { status: result.status });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  const result = await deleteVehicle(getServices(), context.params.vehicleId, toAuthContext(user));
  return NextResponse.json(result.body, { status: result.status });
}
