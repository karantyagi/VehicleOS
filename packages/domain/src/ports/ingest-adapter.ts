import type { IngestChannel } from "../events/catalog.js";

export type IngestCapture = {
  vehicleId: string;
  documentId: string;
  channel: IngestChannel;
  storageKey: string;
  capturedAt: string;
};

export interface IngestAdapter {
  readonly channel: IngestChannel;
  normalize(raw: unknown): IngestCapture;
}
