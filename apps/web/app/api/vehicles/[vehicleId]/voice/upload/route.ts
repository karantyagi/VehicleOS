import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../../../lib/auth/session";
import { getServices } from "../../../../../../lib/api-services";
import { createAdminClient } from "../../../../../../lib/supabase/admin";
import {
  RECEIPT_BUCKET,
  MAX_VOICE_BYTES,
  buildVoiceStorageKey,
  isAllowedVoiceType,
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
  const transcriptField = formData.get("transcript");

  let bytes: Buffer;
  let contentType: string;
  let fileName: string;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_VOICE_BYTES) {
      return NextResponse.json({ error: "file exceeds 5 MB limit" }, { status: 413 });
    }

    contentType = file.type || "application/octet-stream";
    if (!isAllowedVoiceType(contentType)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use WebM, MP3, MP4 audio, or plain text." },
        { status: 415 },
      );
    }

    bytes = Buffer.from(await file.arrayBuffer());
    fileName = file.name;
  } else if (typeof transcriptField === "string" && transcriptField.trim().length > 0) {
    contentType = "text/plain";
    fileName = "voice-note.txt";
    bytes = Buffer.from(transcriptField.trim(), "utf8");
  } else {
    return NextResponse.json({ error: "file or transcript is required" }, { status: 400 });
  }

  const storageKey = buildVoiceStorageKey({
    userId: user.id,
    vehicleId,
    fileName,
  });

  if (isReceiptStorageConfigured()) {
    const admin = createAdminClient();
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
      channel: "voice" as const,
      fileName,
      contentType,
      stored: isReceiptStorageConfigured(),
    },
    { status: 201 },
  );
}
