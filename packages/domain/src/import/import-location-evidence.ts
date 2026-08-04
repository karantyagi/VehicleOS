export type ImportLocationEvidenceStatus =
  | "carfax_reported"
  | "owner_memory"
  | "curated_pack"
  | "geoapify"
  | "owner_reported"
  | "owner_diy"
  | "state_record"
  | "ambiguous"
  | "not_found"
  | "not_initialized";

/** Compact, owner-visible explanation of how a CARFAX row got its location. */
export type ImportLocationEvidence = {
  status: ImportLocationEvidenceStatus;
  location?: string;
  message?: string;
};
