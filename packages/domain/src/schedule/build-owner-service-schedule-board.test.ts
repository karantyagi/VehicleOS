import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { compileServiceAliasRegistry } from "../knowledge/service-alias-registry.js";
import { buildOwnerServiceScheduleBoard } from "./build-owner-service-schedule-board.js";
import type { KnowledgeScheduleEntry, ServiceTimelineEntry } from "../projections/types.js";

const knowledgeRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../knowledge");
const repoRoot = join(knowledgeRoot, "../..");

const loadPackEntries = (packId: string): KnowledgeScheduleEntry[] => {
  const pack = JSON.parse(
    readFileSync(join(knowledgeRoot, "packs", `${packId}.v1.json`), "utf8"),
  ) as {
    manualTitle: string;
    entries: Array<{
      entryId: string;
      serviceName: string;
      intervalMiles?: number | null;
      intervalMonths?: number | null;
      sourcePage: string;
      canonicalServiceId?: string;
    }>;
  };

  return pack.entries.map((entry) => ({
    entryId: entry.entryId,
    serviceName: entry.serviceName,
    intervalMiles: entry.intervalMiles ?? undefined,
    intervalMonths: entry.intervalMonths ?? undefined,
    sourceDocumentId: `pack-${packId}`,
    sourcePage: entry.sourcePage,
    manualTitle: pack.manualTitle,
    recordedAt: "2026-07-27T00:00:00.000Z",
    canonicalServiceId: entry.canonicalServiceId,
  }));
};

const loadCarfaxTimeline = (): ServiceTimelineEntry[] => {
  const carfax = JSON.parse(
    readFileSync(join(repoRoot, "connectors/carfax-connect/examples/tlx-carfax-history.v1.json"), "utf8"),
  ) as {
    services: Array<{
      shop: string;
      serviceDate: string;
      mileage: number;
      lineItems: string[];
    }>;
  };

  return carfax.services.flatMap((service, serviceIndex) =>
    service.lineItems.map((lineItem, lineIndex) => ({
      serviceId: `carfax-${serviceIndex}-${lineIndex}`,
      shop: service.shop,
      serviceDate: service.serviceDate,
      mileage: service.mileage,
      lineItems: [lineItem],
      total: "$0.00",
      evidenceIds: [],
      source: "carfax_import" as const,
    })),
  );
};

const aliasRegistry = compileServiceAliasRegistry([
  JSON.parse(readFileSync(join(knowledgeRoot, "aliases/global.v1.json"), "utf8")),
  JSON.parse(readFileSync(join(knowledgeRoot, "aliases/acura-maintenance-minder.v1.json"), "utf8")),
]);

describe("buildOwnerServiceScheduleBoard — 2021 TLX dogfood", () => {
  const knowledgeSchedule = loadPackEntries("acura-tlx-2021-sh-awd");
  const timeline = loadCarfaxTimeline();

  it("projects all MM subs for owner view (no code-a duplicate)", () => {
    const board = buildOwnerServiceScheduleBoard({
      knowledgeSchedule,
      timeline,
      currentMileage: 59_000,
      ownedSince: "2021-03-18",
      today: "2026-07-27",
      serviceAliasRegistry: aliasRegistry,
    });

    expect(board.rows.length).toBeGreaterThanOrEqual(10);
    expect(board.rows.some((row) => row.entryId === "code-a")).toBe(false);
    expect(board.rows.some((row) => row.entryId === "mm-sub-6")).toBe(true);
    expect(board.rows.some((row) => row.entryId === "mm-sub-2-cabin")).toBe(true);
  });

  it("anchors oil from CARFAX without false overdue", () => {
    const board = buildOwnerServiceScheduleBoard({
      knowledgeSchedule,
      timeline,
      currentMileage: 59_000,
      today: "2026-07-27",
      serviceAliasRegistry: aliasRegistry,
    });

    const oil = board.rows.find((row) => row.entryId === "code-b");
    expect(oil?.verdict).not.toBe("overdue");
    expect(oil?.serviceBaseline.performedMileage).toBe(57_160);
    expect(oil?.historyEvents.length).toBeGreaterThan(0);
  });

  it("flags rear diff due soon at 59k from owner 15k pattern", () => {
    const board = buildOwnerServiceScheduleBoard({
      knowledgeSchedule,
      timeline,
      currentMileage: 59_000,
      today: "2026-07-27",
      serviceAliasRegistry: aliasRegistry,
    });

    const rearDiff = board.rows.find((row) => row.entryId === "mm-sub-6");
    expect(rearDiff?.serviceBaseline.performedMileage).toBe(44_567);
    expect(rearDiff?.verdict === "due_soon" || rearDiff?.verdict === "overdue").toBe(true);
  });

  it("uses needs_baseline when no history imported", () => {
    const board = buildOwnerServiceScheduleBoard({
      knowledgeSchedule,
      timeline: [],
      currentMileage: 59_000,
      ownedSince: "2021-03-18",
      today: "2026-07-27",
      serviceAliasRegistry: aliasRegistry,
    });

    expect(board.summary.needsBaseline).toBe(board.rows.length);
    expect(board.summary.overdue).toBe(0);
  });
});
