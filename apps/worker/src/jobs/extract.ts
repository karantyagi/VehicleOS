import type { ExtractedServiceFields } from "@vehicleos/domain";

export type ExtractJobPayload = {
  vehicleId: string;
  documentId: string;
  storageKey: string;
  shop?: string;
  serviceDate?: string;
  mileage?: number;
  lineItems?: string[];
  total?: string;
};

export const stubExtractReceipt = (payload: ExtractJobPayload): ExtractedServiceFields => ({
  shop: payload.shop ?? "Jiffy Lube",
  serviceDate: payload.serviceDate ?? new Date().toISOString().slice(0, 10),
  mileage: payload.mileage ?? 41_800,
  lineItems: payload.lineItems ?? ["Oil change (synthetic)", "Filter replaced"],
  total: payload.total ?? "$67.42",
  confidence: 0.91,
});

export type WorkerJobPayload = ExtractJobPayload;

export type WorkerJobResult = {
  job: "extract";
  extracted: ExtractedServiceFields;
};

export const processExtractJob = (payload: ExtractJobPayload): WorkerJobResult => ({
  job: "extract",
  extracted: stubExtractReceipt(payload),
});
