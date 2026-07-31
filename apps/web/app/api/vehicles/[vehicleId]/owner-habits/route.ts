import { NextResponse } from "next/server";
import { submitOwnerHabit } from "@vehicleos/server";
import type { OwnerHabitCaptureChannel, OwnerHabitProposalV1 } from "@vehicleos/domain";
import { toAuthContext } from "@/lib/auth/api-context";
import { getSessionUser } from "@/lib/auth/session";
import { getServices } from "@/lib/api-services";

export const runtime = "nodejs";

type RouteContext = { params: { vehicleId: string } };

export async function POST(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  const body = (await request.json()) as {
    text?: string;
    captureChannel?: OwnerHabitCaptureChannel;
    proposal?: OwnerHabitProposalV1;
  };
  const result = await submitOwnerHabit(
    getServices(),
    context.params.vehicleId,
    body,
    toAuthContext(user),
  );
  return NextResponse.json(result.body, { status: result.status });
}
