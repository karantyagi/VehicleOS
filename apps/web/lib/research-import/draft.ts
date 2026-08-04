import type {
  ResearchImportDraft,
  ResearchRecordReview,
  ResearchServiceItemReview,
  ResearchServiceRecord,
  ResearchServiceItemReviewOutcome,
  ResearchVisitReviewOutcome,
} from "./types";

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
          evidencePages: {
            type: "array",
            items: { type: "integer", minimum: 1 },
          },
          recordKind: {
            type: "string",
            enum: ["service", "inspection", "registration", "unknown"],
          },
          reportedBy: {
            type: "string",
            enum: ["shop", "government", "owner", "diy", "unknown"],
          },
          serviceDetailStatus: {
            type: "string",
            enum: ["itemized", "not-itemized", "not-applicable", "unknown"],
          },
          providerLocation: {
            type: "object",
            additionalProperties: false,
            properties: {
              city: { type: ["string", "null"] },
              state: { type: ["string", "null"] },
              status: { type: "string", enum: ["reported", "not-reported", "ambiguous"] },
              source: {
                type: ["string", "null"],
                enum: ["carfax-review-link", "record-text", null],
              },
            },
            required: ["city", "state", "status", "source"],
          },
        },
        required: [
          "serviceDate",
          "mileage",
          "provider",
          "lineItems",
          "confidence",
          "evidence",
          "evidencePages",
          "recordKind",
          "reportedBy",
          "serviceDetailStatus",
          "providerLocation",
        ],
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

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const isRecordKind = (value: unknown): value is ResearchServiceRecord["recordKind"] =>
  value === "service" || value === "inspection" || value === "registration" || value === "unknown";

const isReportedBy = (value: unknown): value is ResearchServiceRecord["reportedBy"] =>
  value === "shop" || value === "government" || value === "owner" || value === "diy" || value === "unknown";

const isServiceDetailStatus = (value: unknown): value is ResearchServiceRecord["serviceDetailStatus"] =>
  value === "itemized" || value === "not-itemized" || value === "not-applicable" || value === "unknown";

const notReportedProviderLocation = (): ResearchServiceRecord["providerLocation"] => ({
  city: null,
  state: null,
  status: "not-reported",
  source: null,
});

const isProviderLocation = (value: unknown): value is ResearchServiceRecord["providerLocation"] => {
  if (!isRecord(value)) return false;
  if (!isNullableString(value.city) || !isNullableString(value.state)) return false;
  if (value.status !== "reported" && value.status !== "not-reported" && value.status !== "ambiguous") return false;
  if (value.source !== "carfax-review-link" && value.source !== "record-text" && value.source !== null) return false;
  if (value.status === "reported") return Boolean(value.city?.trim()) && Boolean(value.state?.trim()) && value.source !== null;
  return true;
};

const isVisitReviewOutcome = (value: unknown): value is ResearchVisitReviewOutcome =>
  value === "unreviewed" || value === "confirmed" || value === "corrected" || value === "not-a-visit" || value === "unsure";

const isServiceItemReviewOutcome = (value: unknown): value is ResearchServiceItemReviewOutcome =>
  value === "unreviewed" || value === "confirmed" || value === "corrected" || value === "not-itemized" ||
  value === "not-supported" || value === "unsure" || value === "added";

const isResearchServiceItemReview = (value: unknown): value is ResearchServiceItemReview =>
  isRecord(value) &&
  isNullableString(value.originalItem) &&
  isNullableString(value.finalItem) &&
  isServiceItemReviewOutcome(value.outcome);

const isResearchRecordReview = (value: unknown): value is ResearchRecordReview =>
  isRecord(value) &&
  isVisitReviewOutcome(value.visitOutcome) &&
  Array.isArray(value.serviceItems) &&
  value.serviceItems.every(isResearchServiceItemReview);

const parseResearchServiceRecord = (value: unknown): ResearchServiceRecord | null => {
  if (!isRecord(value)) return null;
  if (
    !isNullableString(value.serviceDate) ||
    (value.mileage !== null && (typeof value.mileage !== "number" || !Number.isFinite(value.mileage))) ||
    !isNullableString(value.provider) ||
    !Array.isArray(value.lineItems) ||
    !value.lineItems.every((line) => typeof line === "string") ||
    typeof value.confidence !== "number" ||
    !Number.isFinite(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 1 ||
    typeof value.evidence !== "string" ||
    (value.review !== undefined && !isResearchRecordReview(value.review))
  ) return null;

  if (hasOwn(value, "evidencePages") && (!Array.isArray(value.evidencePages) || !value.evidencePages.every((page) => Number.isInteger(page) && page > 0))) return null;
  if (hasOwn(value, "recordKind") && !isRecordKind(value.recordKind)) return null;
  if (hasOwn(value, "reportedBy") && !isReportedBy(value.reportedBy)) return null;
  if (hasOwn(value, "serviceDetailStatus") && !isServiceDetailStatus(value.serviceDetailStatus)) return null;
  if (hasOwn(value, "providerLocation") && !isProviderLocation(value.providerLocation)) return null;

  return {
    serviceDate: value.serviceDate,
    mileage: value.mileage,
    provider: value.provider,
    lineItems: [...value.lineItems],
    confidence: value.confidence,
    evidence: value.evidence,
    evidencePages: hasOwn(value, "evidencePages") ? [...value.evidencePages as number[]] : [],
    recordKind: isRecordKind(value.recordKind) ? value.recordKind : "unknown",
    reportedBy: isReportedBy(value.reportedBy) ? value.reportedBy : "unknown",
    serviceDetailStatus: isServiceDetailStatus(value.serviceDetailStatus) ? value.serviceDetailStatus : "unknown",
    providerLocation: isProviderLocation(value.providerLocation) ? { ...value.providerLocation } : notReportedProviderLocation(),
    ...(value.review ? { review: value.review } : {}),
  };
};

export const parseResearchImportDraft = (value: unknown): ResearchImportDraft | null => {
  if (!isRecord(value)) return null;
  if (
    (value.documentType !== "carfax-service-history" && value.documentType !== "unknown") ||
    !isNullableString(value.vehicleVin) ||
    !Array.isArray(value.records) ||
    !Array.isArray(value.warnings) ||
    !value.warnings.every((warning) => typeof warning === "string")
  ) return null;
  const records = value.records.map(parseResearchServiceRecord);
  if (records.some((record) => record === null)) return null;
  return {
    documentType: value.documentType,
    vehicleVin: value.vehicleVin,
    records: records as ResearchServiceRecord[],
    warnings: [...value.warnings],
  };
};

export const isResearchImportDraft = (value: unknown): value is ResearchImportDraft =>
  parseResearchImportDraft(value) !== null;
