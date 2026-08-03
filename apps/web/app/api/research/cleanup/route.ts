import { NextResponse } from "next/server";
import { isResearchCohortSurface } from "../../../../lib/research-import/policy";
import { purgeExpiredResearchImportRuns } from "../../../../lib/research-import/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isResearchCohortSurface()) return new NextResponse(null, { status: 404 });

  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  if (request.headers.get("authorization") !== "Bearer " + secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await purgeExpiredResearchImportRuns();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "cleanup_unavailable" }, { status: 503 });
  }
}
