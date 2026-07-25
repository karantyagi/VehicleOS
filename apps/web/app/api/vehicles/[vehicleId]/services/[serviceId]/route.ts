import { NextResponse } from "next/server";
import { updateVehicleService } from "@vehicleos/server";
import { toAuthContext } from "../../../../../../lib/auth/api-context";
import { getSessionUser } from "../../../../../../lib/auth/session";
import { getServices } from "../../../../../../lib/api-services";

export const runtime = "nodejs";

type RouteContext = { params: { vehicleId: string; serviceId: string } };

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  const body = (await request.json()) as {
    shop?: string;
    shopLocation?: string | null;
    serviceDate?: string;
    mileage?: number;
    lineItems?: string[];
    total?: string;
  };

  const result = await updateVehicleService(
    getServices(),
    context.params.vehicleId,
    context.params.serviceId,
    body,
    toAuthContext(user),
  );

  return NextResponse.json(result.body, { status: result.status });
}
