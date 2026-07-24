import { NextResponse } from "next/server";
import { submitVehicleOsImport } from "@vehicleos/server";
import { toAuthContext } from "../../../../../lib/auth/api-context";
import { getSessionUser } from "../../../../../lib/auth/session";
import { getServices } from "../../../../../lib/api-services";

export const runtime = "nodejs";

type RouteContext = { params: { vehicleId: string } };

export async function POST(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  const body = (await request.json()) as Parameters<typeof submitVehicleOsImport>[2];

  const result = await submitVehicleOsImport(
    getServices(),
    context.params.vehicleId,
    body,
    toAuthContext(user),
  );

  return NextResponse.json(result.body, { status: result.status });
}
