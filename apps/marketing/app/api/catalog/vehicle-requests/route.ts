import { NextResponse } from "next/server";
import { submitVehicleRequest } from "@vehicleos/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      year?: number;
      make?: string;
      model?: string;
      trim?: string;
      note?: string;
      contactEmail?: string;
      source?: string;
    };

    const result = await submitVehicleRequest({
      year: body.year,
      make: body.make,
      model: body.model,
      trim: body.trim,
      note: body.note,
      contactEmail: body.contactEmail,
      source: body.source ?? "marketing",
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("catalog/vehicle-requests failed", error);
    return NextResponse.json(
      { error: "Could not send your request. Try again.", code: "vehicle_request_failed" },
      { status: 500 },
    );
  }
}
