import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../../../lib/auth/session";
import { getServices } from "../../../../../../lib/api-services";
import {
  MAX_MANUAL_BYTES,
  manualFileTooLargeMessage,
} from "../../../../../../lib/manual-upload-limits";
import {
  buildManualStorageKey,
  createManualSignedUpload,
  isAllowedManualType,
  isReceiptStorageConfigured,
} from "../../../../../../lib/receipt-storage";
import { isAuthEnabled } from "../../../../../../lib/supabase/env";

export const runtime = "nodejs";

type RouteContext = { params: { vehicleId: string } };

type UploadUrlBody = {
  fileName?: string;
  contentType?: string;
  fileSize?: number;
};

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

  let body: UploadUrlBody;
  try {
    body = (await request.json()) as UploadUrlBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fileName = body.fileName?.trim() || "oem-manual.pdf";
  const contentType = body.contentType || "application/pdf";
  const fileSize = body.fileSize ?? 0;

  if (fileSize <= 0) {
    return NextResponse.json({ error: "fileSize is required" }, { status: 400 });
  }
  if (fileSize > MAX_MANUAL_BYTES) {
    return NextResponse.json({ error: manualFileTooLargeMessage(fileSize) }, { status: 413 });
  }
  if (!isAllowedManualType(contentType)) {
    return NextResponse.json({ error: "Upload a PDF manual only" }, { status: 415 });
  }

  const storageKey = buildManualStorageKey({
    userId: user.id,
    vehicleId,
    fileName,
  });

  if (isReceiptStorageConfigured()) {
    const signed = await createManualSignedUpload({
      userId: user.id,
      vehicleId,
      fileName,
    });

    if (!signed) {
      return NextResponse.json({ error: "Could not prepare upload" }, { status: 500 });
    }

    return NextResponse.json({
      mode: "signed" as const,
      signedUrl: signed.signedUrl,
      token: signed.token,
      storageKey: signed.storageKey,
      path: signed.path,
      maxBytes: MAX_MANUAL_BYTES,
      contentType,
    });
  }

  if (isAuthEnabled()) {
    return NextResponse.json({
      mode: "session" as const,
      storageKey,
      bucket: "receipts",
      maxBytes: MAX_MANUAL_BYTES,
      contentType,
    });
  }

  return NextResponse.json({
    mode: "dev" as const,
    storageKey,
    maxBytes: MAX_MANUAL_BYTES,
    contentType,
    stored: false,
  });
}
