import { NextResponse } from "next/server";
import { saveOwnerDriverLicense } from "@vehicleos/server";
import { toAuthContext } from "@/lib/auth/api-context";
import { getSessionUser } from "@/lib/auth/session";
import { getServices } from "@/lib/api-services";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSessionUser();
  const body = (await request.json()) as {
    recordId?: string;
    jurisdiction?: string;
    agency?: string;
    expirationDate?: string;
    description?: string;
  };
  const result = await saveOwnerDriverLicense(getServices(), body, toAuthContext(user));
  return NextResponse.json(result.body, { status: result.status });
}
