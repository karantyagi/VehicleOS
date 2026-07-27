import type { KnowledgeScheduleEntry } from "../projections/types.js";

/** Keep the latest row per entryId when OEM packs are upgraded in place. */
export const dedupeKnowledgeScheduleEntries = (
  entries: KnowledgeScheduleEntry[],
): KnowledgeScheduleEntry[] => {
  const byEntryId = new Map<string, KnowledgeScheduleEntry>();

  for (const entry of entries) {
    const existing = byEntryId.get(entry.entryId);
    if (!existing) {
      byEntryId.set(entry.entryId, entry);
      continue;
    }

    const existingRecordedAt = existing.recordedAt ?? "";
    const nextRecordedAt = entry.recordedAt ?? "";
    if (nextRecordedAt >= existingRecordedAt) {
      byEntryId.set(entry.entryId, entry);
    }
  }

  return [...byEntryId.values()];
};
