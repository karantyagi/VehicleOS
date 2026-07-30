export type MaintenancePatternMemory = {
  timing: "early" | "late";
  reason: string;
  confirmedAt: string;
};

/** Owner-verified interval overlay — does not mutate OEM truth, only projection input. */
export type IntervalBasis = "mileage" | "time" | "mixed";

export type TireRotationConditionId =
  | "uneven_tread"
  | "pressure_or_tpms"
  | "pull_vibration_or_cupping"
  | "special_tire_setup";

export type IntervalOverlayMemory = {
  intervalMonths?: number | null;
  intervalMiles?: number | null;
  basis?: IntervalBasis;
  tireRotationConditions?: TireRotationConditionId[];
  label: string;
  confirmedAt: string;
};

export type OwnerContextMemory = {
  /** Where the car is usually garaged — static until owner confirms an update. */
  primaryCity?: string;
  /** ISO date (YYYY-MM-DD) when primaryCity was last confirmed by the owner. */
  primaryCityUpdatedAt?: string;
  climateNotes?: string[];
  lastTireProduct?: string;
  ownerStatedPriorities?: string[];
  shopLocations?: Record<string, string>;
  /** Owner-confirmed timing patterns keyed by OEM schedule entryId (V2). */
  maintenancePatterns?: Record<string, MaintenancePatternMemory>;
  /** Verified owner intervals (e.g. Techron every 3k mi) keyed by entryId or custom slug. */
  intervalOverlays?: Record<string, IntervalOverlayMemory>;
};

export const EMPTY_OWNER_CONTEXT_MEMORY: OwnerContextMemory = {};
