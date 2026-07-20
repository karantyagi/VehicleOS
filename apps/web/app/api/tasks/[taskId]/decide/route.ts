import { NextResponse } from "next/server";
import { decideOnTask } from "@vehicleos/server";
import { toAuthContext } from "../../../../../lib/auth/api-context";
import { getSessionUser } from "../../../../../lib/auth/session";
import { getServices } from "../../../../../lib/api-services";

export const runtime = "nodejs";

type RouteContext = { params: { taskId: string } };

export async function POST(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  const body = (await request.json()) as {
    vehicleId: string;
    decision: "approve" | "dismiss" | "snooze";
  };
  const result = await decideOnTask(
    getServices(),
    context.params.taskId,
    body,
    toAuthContext(user),
  );
  return NextResponse.json(result.body, { status: result.status });
}
