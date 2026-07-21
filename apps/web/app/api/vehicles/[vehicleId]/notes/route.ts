import { NextResponse } from "next/server";
import { submitOwnerServiceNote } from "@vehicleos/server";
import { toAuthContext } from "../../../../../lib/auth/api-context";
import { getSessionUser } from "../../../../../lib/auth/session";
import { getServices } from "../../../../../lib/api-services";

export const runtime = "nodejs";

type RouteContext = { params: { vehicleId: string } };

export async function POST(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  const body = (await request.json()) as {
    shop?: string;
    serviceDate: string;
    mileage: number;
    lineItems?: string[];
    total?: string;
    source?: "owner_note" | "dealer";
    note?: string;
  };

  const result = await submitOwnerServiceNote(
    getServices(),
    context.params.vehicleId,
    body,
    toAuthContext(user),
  );

  return NextResponse.json(result.body, { status: result.status });
}
