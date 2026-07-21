import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../../../lib/auth/session";
import { getServices } from "../../../../../../lib/api-services";
import { createAdminClient } from "../../../../../../lib/supabase/admin";
import {
  RECEIPT_BUCKET,
  MAX_RECEIPT_BYTES,
  buildReceiptStorageKey,
  inferReceiptChannel,
  isAllowedReceiptType,
  isReceiptStorageConfigured,
} from "../../../../../../lib/receipt-storage";

export const runtime = "nodejs";

type RouteContext = { params: { vehicleId: string } };

export async function POST(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { vehicleId } = context.params;
  const vehicle = await getServices().vehicles.findById(vehicleId);
  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }
  if (vehicle.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "file is empty" }, { status: 400 });
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    return NextResponse.json({ error: "file exceeds 10 MB limit" }, { status: 413 });
  }

  const contentType = file.type || "application/octet-stream";
  if (!isAllowedReceiptType(contentType)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use JPEG, PNG, WebP, HEIC, or PDF." },
      { status: 415 },
    );
  }

  const channel = inferReceiptChannel(contentType);
  const storageKey = buildReceiptStorageKey({
    userId: user.id,
    vehicleId,
    fileName: file.name,
  });

  if (isReceiptStorageConfigured()) {
    const admin = createAdminClient();
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error } = await admin.storage.from(RECEIPT_BUCKET).upload(storageKey, bytes, {
      contentType,
      upsert: false,
    });

    if (error) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  }

  return NextResponse.json(
    {
      storageKey,
      channel,
      fileName: file.name,
      contentType,
      stored: isReceiptStorageConfigured(),
    },
    { status: 201 },
  );
}
