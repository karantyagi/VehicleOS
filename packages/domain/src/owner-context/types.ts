export type OwnerContextMemory = {
  /** Where the car is usually garaged — static until owner confirms an update. */
  primaryCity?: string;
  /** ISO date (YYYY-MM-DD) when primaryCity was last confirmed by the owner. */
  primaryCityUpdatedAt?: string;
  climateNotes?: string[];
  lastTireProduct?: string;
  ownerStatedPriorities?: string[];
  shopLocations?: Record<string, string>;
};

export const EMPTY_OWNER_CONTEXT_MEMORY: OwnerContextMemory = {};
