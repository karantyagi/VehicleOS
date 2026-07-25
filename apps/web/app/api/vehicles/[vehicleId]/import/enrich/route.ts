import { NextResponse } from "next/server";
import { enrichVehicleOsImportDraftHandler } from "@vehicleos/server";
import { toAuthContext } from "../../../../../../lib/auth/api-context";
import { getSessionUser } from "../../../../../../lib/auth/session";
import { getServices } from "../../../../../../lib/api-services";

export const runtime = "nodejs";

type RouteContext = { params: { vehicleId: string } };

export async function POST(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  const body = (await request.json()) as { draft?: unknown };

  const result = await enrichVehicleOsImportDraftHandler(
    getServices(),
    context.params.vehicleId,
    body as Parameters<typeof enrichVehicleOsImportDraftHandler>[2],
    toAuthContext(user),
  );

  return NextResponse.json(result.body, { status: result.status });
}
