import type { IngestAdapter, IngestCapture } from "../ports/ingest-adapter.js";

type ReceiptUploadRaw = {
  vehicleId: string;
  documentId?: string;
  storageKey: string;
  capturedAt?: string;
};

export class ReceiptUploadAdapter implements IngestAdapter {
  readonly channel = "receipt_upload" as const;

  normalize(raw: unknown): IngestCapture {
    if (!isReceiptUploadRaw(raw)) {
      throw new Error("ReceiptUploadAdapter expected { vehicleId, storageKey }");
    }

    return {
      vehicleId: raw.vehicleId,
      documentId: raw.documentId ?? crypto.randomUUID(),
      channel: this.channel,
      storageKey: raw.storageKey,
      capturedAt: raw.capturedAt ?? new Date().toISOString(),
    };
  }
}

const isReceiptUploadRaw = (raw: unknown): raw is ReceiptUploadRaw =>
  typeof raw === "object" &&
  raw !== null &&
  "vehicleId" in raw &&
  "storageKey" in raw &&
  typeof (raw as ReceiptUploadRaw).vehicleId === "string" &&
  typeof (raw as ReceiptUploadRaw).storageKey === "string";
