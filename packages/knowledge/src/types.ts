export type OemSchedulePack = {
  packId: string;
  version: number;
  manualTitle: string;
  scheduleKind?: "maintenance_minder" | "fixed_interval" | "ev_simplified";
  qaStatus: "auto_verified" | "creator_review_required" | "blocked";
  qaNotes?: string;
  sourceManifestRef?: string;
  vehicle: {
    make: string;
    model: string;
    year: number;
    trim: string;
    powertrain?: string;
    market?: "US" | "CA";
  };
  entries: OemSchedulePackEntry[];
};

export type OemSchedulePackEntry = {
  entryId: string;
  canonicalServiceId: string;
  serviceName: string;
  intervalMiles?: number | null;
  intervalMonths?: number | null;
  sourcePage: string;
  confidence: number;
  ruleId: string;
  mainItemCode?: string;
  subItemCode?: string;
  powertrain?: string;
  severeIntervalMiles?: number;
  severeIntervalRepeatMiles?: number;
  projectionNote?: string;
};

export type ServiceAliasBundle = {
  bundleId: string;
  version: number;
  oemFamily?: string;
  aliases: ServiceAlias[];
};

export type ServiceAlias = {
  canonicalServiceId: string;
  phrase: string;
  matchKind: "exact" | "contains" | "regex";
  priority: number;
  source: "creator" | "dogfood" | "owner_confirmed";
};

export type SupportedVehicleCatalog = {
  version: number;
  vehicles: SupportedVehicleRow[];
};

/**
 * Maps an external vehicle-decoder name to the spelling used by VehicleOS's
 * verified OEM schedule catalog. This is identity vocabulary only: it never
 * selects a schedule pack or trim on an owner's behalf.
 */
export type VehicleIdentityAliasRegistry = {
  version: number;
  aliases: VehicleIdentityAlias[];
};

export type VehicleIdentityAlias = {
  source: "nhtsa_vpic";
  externalMake: string;
  externalModel: string;
  canonicalMake: string;
  canonicalModel: string;
  /** The verified OEM packs that establish this product identity. */
  oemPackIds: string[];
};

export type CanonicalVehicleIdentity = {
  make: string;
  model: string;
  year: number;
};

export type SupportedVehicleIdentityResolution = {
  canonical: CanonicalVehicleIdentity | null;
  candidates: SupportedVehicleRow[];
};

export type SupportedVehicleRow = {
  packId: string;
  make: string;
  model: string;
  year: number;
  trim: string;
  powertrain?: string;
  qaStatus: OemSchedulePack["qaStatus"];
  supportTier: "tier1" | "tier2" | "tier3";
  /** verified = full OEM pack (8+ rows); preview = scaffold / not for owner demo */
  scheduleDepth?: "verified" | "preview";
};
