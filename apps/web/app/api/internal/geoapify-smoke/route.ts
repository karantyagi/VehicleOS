import { NextResponse } from "next/server";
import { handleGeoapifyDeploymentSmoke } from "@/lib/deployment-geoapify-smoke";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Private deployment verification only. The Supabase middleware allows this
 * route through so this independent bearer-token guard can avoid requiring an
 * owner session while still returning 404 to all other callers.
 */
export async function GET(request: Request) {
  const result = await handleGeoapifyDeploymentSmoke(request.headers.get("authorization"));
  return NextResponse.json(result.body, { status: result.status });
}
