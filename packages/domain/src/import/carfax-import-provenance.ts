import type { CarfaxSourceTrust } from "./carfax-source-trust.js";
import type { ImportLocationEvidence } from "./import-location-evidence.js";

/**
 * The owner-facing basis for a CARFAX service record after it enters History.
 * It is written by the import handler, rather than trusted directly from a browser.
 */
export type CarfaxImportProvenance = {
  sourceTrust: CarfaxSourceTrust;
  locationEvidence: ImportLocationEvidence;
  /** Present only when this row needed and received an explicit owner decision. */
  ownerConfirmedAt?: string;
};
