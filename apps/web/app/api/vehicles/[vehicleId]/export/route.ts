import { NextResponse } from "next/server";
import { exportResaleReport, type ExportHandlerResponse } from "@vehicleos/server";
import { toAuthContext } from "../../../../../lib/auth/api-context";
import { getSessionUser } from "../../../../../lib/auth/session";
import { getServices } from "../../../../../lib/api-services";

export const runtime = "nodejs";

type RouteContext = { params: { vehicleId: string } };

export async function GET(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  const formatParam = new URL(request.url).searchParams.get("format");
  const format = formatParam === "markdown" ? "markdown" : "json";
  const result = await exportResaleReport(
    getServices(),
    context.params.vehicleId,
    format,
    toAuthContext(user),
  );

  if ("headers" in result) {
    const exportResult = result as ExportHandlerResponse;
    return new NextResponse(exportResult.body, {
      status: exportResult.status,
      headers: exportResult.headers,
    });
  }

  return NextResponse.json(result.body, { status: result.status });
}
