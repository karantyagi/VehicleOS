import { createAdminClient } from "./supabase/admin";

export const RECEIPT_BUCKET = "receipts";
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

export type ReceiptUploadChannel = "photo" | "receipt_upload";

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

export const isReceiptStorageConfigured = (): boolean =>
  process.env.AUTH_DISABLED !== "true" && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export const isAllowedReceiptType = (contentType: string): boolean =>
  ALLOWED_CONTENT_TYPES.has(contentType);

export const inferReceiptChannel = (contentType: string): ReceiptUploadChannel =>
  contentType === "application/pdf" ? "receipt_upload" : "photo";

export const sanitizeReceiptFileName = (fileName: string): string => {
  const base = fileName.split(/[/\\]/).pop() ?? "receipt";
  const cleaned = base.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(0, 120);
  return cleaned.length > 0 ? cleaned : "receipt";
};

export const buildReceiptStorageKey = (input: {
  userId: string;
  vehicleId: string;
  fileName: string;
}): string => {
  const safeName = sanitizeReceiptFileName(input.fileName);
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
