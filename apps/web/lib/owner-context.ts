export type OwnerContextMemory = {
  primaryCity?: string;
  primaryCityUpdatedAt?: string;
  climateNotes?: string[];
  lastTireProduct?: string;
  ownerStatedPriorities?: string[];
  shopLocations?: Record<string, string>;
};

export type OwnerContextDraft = {
  primaryCity: string;
  climateNotesInput: string;
  lastTireProduct: string;
  ownerStatedPrioritiesInput: string;
};

export const parseMultilineList = (value: string): string[] =>
  value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);

export const formatMultilineList = (values: string[] | undefined): string =>
  values?.join("\n") ?? "";

import { todayIsoDate } from "@/lib/date-input";

export const ownerContextFromDraft = (draft: OwnerContextDraft): OwnerContextMemory => {
  const primaryCity = draft.primaryCity.trim() || undefined;
  return {
    primaryCity,
    primaryCityUpdatedAt: primaryCity ? todayIsoDate() : undefined,
    climateNotes: parseMultilineList(draft.climateNotesInput),
    lastTireProduct: draft.lastTireProduct.trim() || undefined,
    ownerStatedPriorities: parseMultilineList(draft.ownerStatedPrioritiesInput),
  };
};

export const draftFromOwnerContext = (
  memory: OwnerContextMemory | null | undefined,
): OwnerContextDraft => ({
  primaryCity: memory?.primaryCity ?? "",
  climateNotesInput: formatMultilineList(memory?.climateNotes),
  lastTireProduct: memory?.lastTireProduct ?? "",
  ownerStatedPrioritiesInput: formatMultilineList(memory?.ownerStatedPriorities),
});
