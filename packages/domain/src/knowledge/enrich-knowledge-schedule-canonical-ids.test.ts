import { describe, expect, it } from "vitest";
import { enrichKnowledgeScheduleCanonicalIds } from "./enrich-knowledge-schedule-canonical-ids.js";
import type { KnowledgeScheduleEntry } from "../projections/types.js";

const row = (overrides: Partial<KnowledgeScheduleEntry>): KnowledgeScheduleEntry => ({
  entryId: "code-b",
  serviceName: "Replace engine oil and filter (Maintenance Minder B)",
  intervalMiles: 10_000,
  sourceDocumentId: "doc-1",
  manualTitle: "Manual",
  recordedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("enrichKnowledgeScheduleCanonicalIds", () => {
  it("backfills missing canonicalServiceId from pack index", () => {
    const enriched = enrichKnowledgeScheduleCanonicalIds([row({})], {
      "code-b": "acura.mm.b.oil_filter",
    });

    expect(enriched[0]?.canonicalServiceId).toBe("acura.mm.b.oil_filter");
  });

  it("does not overwrite confirmed canonicalServiceId on row", () => {
    const enriched = enrichKnowledgeScheduleCanonicalIds(
      [row({ canonicalServiceId: "custom.id" })],
      { "code-b": "acura.mm.b.oil_filter" },
    );

    expect(enriched[0]?.canonicalServiceId).toBe("custom.id");
  });
});
