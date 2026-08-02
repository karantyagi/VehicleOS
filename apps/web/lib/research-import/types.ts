export const RESEARCH_COHORT_SURFACE = "research-cohort";
export const RESEARCH_IMPORT_SOURCE = "carfax-pdf";
export const RESEARCH_SCHEMA_VERSION = "carfax-service-history.v1";
export const RESEARCH_PROMPT_VERSION = "research-carfax-contract.v1";

export type ResearchRunStatus =
  | "uploaded"
  | "text-unavailable"
  | "model-not-configured"
  | "extracted"
  | "extract-failed"
  | "reviewed";

export type ResearchServiceRecord = {
  serviceDate: string | null;
  mileage: number | null;
  provider: string | null;
  lineItems: string[];
  confidence: number;
  evidence: string;
};

export type ResearchImportDraft = {
  documentType: "carfax-service-history" | "unknown";
  vehicleVin: string | null;
  records: ResearchServiceRecord[];
  warnings: string[];
};

export type ResearchImportRun = {
  id: string;
  source: typeof RESEARCH_IMPORT_SOURCE;
  status: ResearchRunStatus;
  fileName: string;
  createdAt: string;
  deleteAfter: string;
  textCharacterCount: number | null;
  model: string | null;
  promptVersion: string;
  draft: ResearchImportDraft | null;
  ownerDraft: ResearchImportDraft | null;
  errorCode: string | null;
};

export type ResearchRunStoreInput = {
  id: string;
  userId: string;
  consentVersion: string;
  retainForEvals: boolean;
  fileName: string;
  fileBytes: number;
  contentSha256: string;
  storageKey: string;
  textCharacterCount: number | null;
  status: ResearchRunStatus;
  model: string | null;
  promptVersion?: string;
  draft?: ResearchImportDraft | null;
  ownerDraft?: ResearchImportDraft | null;
  errorCode?: string | null;
  deleteAfter: string;
};
