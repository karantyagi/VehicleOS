export type OwnerContextMemory = {
  primaryCity?: string;
  climateNotes?: string[];
  lastTireProduct?: string;
  ownerStatedPriorities?: string[];
  shopLocations?: Record<string, string>;
};

export const EMPTY_OWNER_CONTEXT_MEMORY: OwnerContextMemory = {};
