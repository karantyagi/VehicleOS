import { createAdminClient } from "./supabase/admin";

export const RECEIPT_BUCKET = "receipts";
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
export const MAX_VOICE_BYTES = 5 * 1024 * 1024;
/** OEM PDFs — uploaded direct-to-storage (see ADR-007). */
export const MAX_MANUAL_BYTES = 50 * 1024 * 1024;

export type ReceiptUploadChannel = "photo" | "receipt_upload";
export type VoiceUploadChannel = "voice";

const ALLOWED_RECEIPT_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

const ALLOWED_VOICE_CONTENT_TYPES = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/mpeg",
  "audio/mp4",
  "text/plain",
]);

export const isReceiptStorageConfigured = (): boolean =>
  process.env.AUTH_DISABLED !== "true" && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export const isAllowedReceiptType = (contentType: string): boolean =>
  ALLOWED_RECEIPT_CONTENT_TYPES.has(contentType);

export const isAllowedVoiceType = (contentType: string): boolean =>
  ALLOWED_VOICE_CONTENT_TYPES.has(contentType);

export const inferReceiptChannel = (contentType: string): ReceiptUploadChannel =>
  contentType === "application/pdf" ? "receipt_upload" : "photo";

export const sanitizeEvidenceFileName = (fileName: string, fallback: string): string => {
  const base = fileName.split(/[/\\]/).pop() ?? fallback;
  const cleaned = base.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(0, 120);
  return cleaned.length > 0 ? cleaned : fallback;
};

export const buildReceiptStorageKey = (input: {
  userId: string;
  vehicleId: string;
  fileName: string;
}): string => {
  const safeName = sanitizeEvidenceFileName(input.fileName, "receipt");
  return `${input.userId}/${input.vehicleId}/${Date.now()}-${safeName}`;
};

export const buildVoiceStorageKey = (input: {
  userId: string;
  vehicleId: string;
  fileName: string;
}): string => {
  const safeName = sanitizeEvidenceFileName(input.fileName, "voice-note.webm");
  return `${input.userId}/${input.vehicleId}/${Date.now()}-${safeName}`;
};

export const isAllowedManualType = (contentType: string): boolean => contentType === "application/pdf";

export const buildManualStorageKey = (input: {
  userId: string;
  vehicleId: string;
  fileName: string;
}): string => {
  const safeName = sanitizeEvidenceFileName(input.fileName, "oem-manual.pdf");
  return `${input.userId}/${input.vehicleId}/${Date.now()}-${safeName}`;
};

export const createReceiptSignedUrl = async (
  storageKey: string,
): Promise<{ signedUrl: string; expiresInSeconds: number } | null> => {
  if (!isReceiptStorageConfigured()) return null;

  const admin = createAdminClient();
  const ttlSeconds = 120;
  const { data, error } = await admin.storage.from(RECEIPT_BUCKET).createSignedUrl(storageKey, ttlSeconds);

  if (error || !data?.signedUrl) return null;

  return {
    signedUrl: data.signedUrl,
    expiresInSeconds: ttlSeconds,
  };
};

export type ManualSignedUpload = {
  signedUrl: string;
  token: string;
  storageKey: string;
  path: string;
};

export const createManualSignedUpload = async (input: {
  userId: string;
  vehicleId: string;
  fileName: string;
}): Promise<ManualSignedUpload | null> => {
  if (!isReceiptStorageConfigured()) return null;

  const storageKey = buildManualStorageKey(input);
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(RECEIPT_BUCKET).createSignedUploadUrl(storageKey);

  if (error || !data?.signedUrl || !data.token) return null;

  return {
    signedUrl: data.signedUrl,
    token: data.token,
    storageKey,
    path: data.path,
  };
};
