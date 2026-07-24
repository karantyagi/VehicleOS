export type OwnerContextMemory = {
  primaryCity?: string;
  climateNotes?: string[];
  lastTireProduct?: string;
  ownerStatedPriorities?: string[];
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

export const ownerContextFromDraft = (draft: OwnerContextDraft): OwnerContextMemory => ({
  primaryCity: draft.primaryCity.trim() || undefined,
  climateNotes: parseMultilineList(draft.climateNotesInput),
  lastTireProduct: draft.lastTireProduct.trim() || undefined,
  ownerStatedPriorities: parseMultilineList(draft.ownerStatedPrioritiesInput),
});

export const draftFromOwnerContext = (
  memory: OwnerContextMemory | null | undefined,
): OwnerContextDraft => ({
  primaryCity: memory?.primaryCity ?? "",
  climateNotesInput: formatMultilineList(memory?.climateNotes),
  lastTireProduct: memory?.lastTireProduct ?? "",
  ownerStatedPrioritiesInput: formatMultilineList(memory?.ownerStatedPriorities),
});
