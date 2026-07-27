import type { KnowledgeScheduleEntry } from "../projections/types.js";

/** Backfill canonicalServiceId from OEM pack index — idempotent, no event rewrite. */
export const enrichKnowledgeScheduleCanonicalIds = (
  schedule: KnowledgeScheduleEntry[],
  canonicalIdsByEntryId: Record<string, string | undefined>,
): KnowledgeScheduleEntry[] =>
  schedule.map((entry) => ({
    ...entry,
    canonicalServiceId:
      entry.canonicalServiceId ?? canonicalIdsByEntryId[entry.entryId] ?? undefined,
  }));
