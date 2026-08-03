import type { ResearchImportDraft, ResearchServiceRecord } from "./types";

export const CARFAX_SERVICE_HISTORY_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    documentType: {
      type: "string",
      enum: ["carfax-service-history", "unknown"],
    },
    vehicleVin: {
      type: ["string", "null"],
    },
    records: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          serviceDate: { type: ["string", "null"] },
          mileage: { type: ["number", "null"] },
          provider: { type: ["string", "null"] },
          lineItems: {
            type: "array",
            items: { type: "string" },
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          evidence: { type: "string" },
        },
        required: ["serviceDate", "mileage", "provider", "lineItems", "confidence", "evidence"],
      },
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["documentType", "vehicleVin", "records", "warnings"],
} as const;

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isResearchServiceRecord = (value: unknown): value is ResearchServiceRecord => {
  if (!isRecord(value)) return false;
  return (
    isNullableString(value.serviceDate) &&
    (value.mileage === null || (typeof value.mileage === "number" && Number.isFinite(value.mileage))) &&
    isNullableString(value.provider) &&
    Array.isArray(value.lineItems) &&
    value.lineItems.every((line) => typeof line === "string") &&
    typeof value.confidence === "number" &&
    Number.isFinite(value.confidence) &&
    value.confidence >= 0 &&
    value.confidence <= 1 &&
    typeof value.evidence === "string"
  );
};

export const isResearchImportDraft = (value: unknown): value is ResearchImportDraft => {
  if (!isRecord(value)) return false;
  return (
    (value.documentType === "carfax-service-history" || value.documentType === "unknown") &&
    isNullableString(value.vehicleVin) &&
    Array.isArray(value.records) &&
    value.records.every(isResearchServiceRecord) &&
    Array.isArray(value.warnings) &&
    value.warnings.every((warning) => typeof warning === "string")
  );
};

export const parseResearchImportDraft = (value: unknown): ResearchImportDraft | null =>
  isResearchImportDraft(value) ? value : null;
