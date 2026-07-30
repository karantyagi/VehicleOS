import { describe, expect, it } from "vitest";
import { dedupeKnowledgeScheduleEntries } from "./dedupe-knowledge-schedule.js";
import type { KnowledgeScheduleEntry } from "../projections/types.js";

const row = (input: Partial<KnowledgeScheduleEntry> & Pick<KnowledgeScheduleEntry, "entryId">): KnowledgeScheduleEntry => ({
  entryId: input.entryId,
  serviceName: input.serviceName ?? "Service",
  intervalMiles: input.intervalMiles ?? 7500,
  intervalMonths: input.intervalMonths ?? 12,
  sourceDocumentId: input.sourceDocumentId ?? "doc-1",
  sourcePage: input.sourcePage,
  canonicalServiceId: input.canonicalServiceId,
  manualTitle: input.manualTitle ?? "Manual",
  recordedAt: input.recordedAt ?? "2026-01-01T00:00:00.000Z",
});

describe("dedupeKnowledgeScheduleEntries", () => {
  it("keeps the latest row per entryId", () => {
    const deduped = dedupeKnowledgeScheduleEntries([
      row({ entryId: "code-b", intervalMiles: 5000, recordedAt: "2025-01-01T00:00:00.000Z" }),
      row({ entryId: "code-b", intervalMiles: 7500, recordedAt: "2026-07-01T00:00:00.000Z" }),
      row({ entryId: "mm-sub-1", recordedAt: "2025-01-01T00:00:00.000Z" }),
    ]);

    expect(deduped).toHaveLength(2);
    expect(deduped.find((entry) => entry.entryId === "code-b")?.intervalMiles).toBe(7500);
  });
});
