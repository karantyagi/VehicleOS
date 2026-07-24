import type { OwnerContextMemory } from "./types.js";

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeStringList = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
};

export const normalizeOwnerContextMemory = (value: unknown): OwnerContextMemory => {
  if (!value || typeof value !== "object") return {};

  const record = value as Record<string, unknown>;

  return {
    primaryCity: normalizeString(record.primaryCity),
    climateNotes: normalizeStringList(record.climateNotes),
    lastTireProduct: normalizeString(record.lastTireProduct),
    ownerStatedPriorities: normalizeStringList(record.ownerStatedPriorities),
  };
};

export const hasOwnerContextMemory = (value: OwnerContextMemory | null | undefined): boolean => {
  if (!value) return false;
  return Boolean(
    value.primaryCity ||
      (value.climateNotes?.length ?? 0) > 0 ||
      value.lastTireProduct ||
      (value.ownerStatedPriorities?.length ?? 0) > 0,
  );
};
