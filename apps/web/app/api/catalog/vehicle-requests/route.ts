import { NextResponse } from "next/server";
import {
  previewVehicleRequestContact,
  resolveVehicleRequestContactEmail,
  submitVehicleRequest,
} from "@vehicleos/server";
import { toAuthContext } from "@/lib/auth/api-context";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  const result = previewVehicleRequestContact(user?.email);
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to request a vehicle.", code: "auth_required" }, { status: 401 });
  }

  const body = (await request.json()) as {
    year?: number;
    make?: string;
    model?: string;
    trim?: string;
    note?: string;
    contactEmail?: string;
    source?: string;
  };

  const contactEmail =
    resolveVehicleRequestContactEmail({
      sessionEmail: user.email,
      bodyEmail: body.contactEmail,
    }) ?? "";

  const result = await submitVehicleRequest({
    year: body.year,
    make: body.make,
    model: body.model,
    trim: body.trim,
    note: body.note,
    contactEmail,
    source: body.source ?? "onboarding",
    userId: toAuthContext(user)?.userId,
  });

  return NextResponse.json(result.body, { status: result.status });
}
