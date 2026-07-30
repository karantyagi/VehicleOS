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

const loadCarfaxTimelineAsImported = (): ServiceTimelineEntry[] => {
  const carfax = JSON.parse(
    readFileSync(join(repoRoot, "connectors/carfax-connect/examples/tlx-carfax-history.v1.json"), "utf8"),
  ) as {
    services: Array<{
      shop: string;
      shopLocation?: string;
      serviceDate: string;
      mileage: number;
      lineItems: string[];
      total?: string;
    }>;
  };

  return carfax.services.map((service, serviceIndex) => ({
    serviceId: `carfax-import-${serviceIndex}`,
    shop: service.shop,
    shopLocation: service.shopLocation,
    serviceDate: service.serviceDate,
    mileage: service.mileage,
    lineItems: service.lineItems,
    total: service.total ?? "$0.00",
    evidenceIds: [],
    source: "carfax_import" as const,
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

  it("shows only matching line items when one visit lists multiple services", () => {
    const multiLineVisit: ServiceTimelineEntry = {
      serviceId: "visit-ira-30777",
      shop: "Ira Acura Westwood",
      serviceDate: "2024-03-25",
      mileage: 30_777,
      lineItems: [
        "Drive belts checked",
        "Emissions or safety inspection performed",
        "Oil and filter changed",
        "Tire condition and pressure checked",
        "Tires rotated",
        "Air filter replaced",
        "Cabin air filter replaced/cleaned",
        "Safety inspection performed",
        "Emissions inspection performed",
      ],
      total: "$0.00",
      evidenceIds: [],
      source: "carfax_import",
    };

    const board = buildOwnerServiceScheduleBoard({
      knowledgeSchedule,
      timeline: [multiLineVisit],
      currentMileage: 59_000,
      today: "2026-07-27",
      serviceAliasRegistry: aliasRegistry,
    });

    const driveBelt = board.rows.find((row) => row.entryId === "mm-sub-2-drive-belt");
    expect(driveBelt?.historyEvents).toHaveLength(1);
    expect(driveBelt?.historyEvents[0]?.lineItem).toBe("Drive belts checked");

    const oil = board.rows.find((row) => row.entryId === "code-b");
    expect(oil?.historyEvents).toHaveLength(1);
    expect(oil?.historyEvents[0]?.lineItem).toMatch(/oil and filter/i);

    const rotation = board.rows.find((row) => row.entryId === "mm-sub-1");
    expect(rotation?.historyEvents).toHaveLength(1);
    expect(rotation?.historyEvents[0]?.lineItem).toMatch(/tires rotated/i);
  });

  it("filters Ira Acura multi-line CARFAX visit in real import shape", () => {
    const board = buildOwnerServiceScheduleBoard({
      knowledgeSchedule,
      timeline: loadCarfaxTimelineAsImported(),
      currentMileage: 58_819,
      today: "2026-07-27",
      serviceAliasRegistry: aliasRegistry,
    });

    const driveBelt = board.rows.find((row) => row.entryId === "mm-sub-2-drive-belt");
    const iraDriveBeltEvents = driveBelt?.historyEvents.filter(
      (event) => event.shop === "Ira Acura Westwood" && event.serviceDate === "2024-03-25",
    );
    expect(iraDriveBeltEvents).toHaveLength(1);
    expect(iraDriveBeltEvents?.[0]?.lineItem).toBe("Drive belts checked");
  });

  it("builds the TLX Rotate Tires interval and Costco action recommendation", () => {
    const board = buildOwnerServiceScheduleBoard({
      knowledgeSchedule,
      timeline: loadCarfaxTimelineAsImported(),
      currentMileage: 59_100,
      effectiveMilesPerYear: 10_000,
      today: "2026-07-30",
      ownerContextMemory: {
        primaryCity: "Boston",
        lastTireProduct: "Michelin Pilot Sport All Season 4 255/40ZR19",
        ownerStatedPriorities: ["safety", "maximize_tire_life"],
      },
      serviceAliasRegistry: aliasRegistry,
    });

    const rotation = board.rows.find((row) => row.entryId === "mm-sub-1");
    expect(rotation?.intelligence?.itemKind).toBe("tire_rotation");
    expect(rotation?.intelligence?.whyNow).toContain("7,219 mi remaining");
    expect(rotation?.intelligence?.intervalRecommendation).toMatchObject({
      status: "active",
      recommendedMiles: 6_000,
      projectedDueMileage: 64_819,
      recentGapsMiles: [5_853, 7_982, 5_594],
      recentAverageMiles: 6_476,
      recentMedianMiles: 5_853,
      confidence: "medium",
      evidenceNote: "3 current-tire intervals · variable",
      activeSource: "oem",
    });
    expect(rotation?.intelligence?.actionRecommendation).toMatchObject({
      status: "active",
      method: "tire_retailer",
      providerName: "Costco Tire Center",
      providerLocation: "Waltham, MA",
      expectedCost: {
        amount: 0,
        label: "Expected $0",
        basis: "observed_history",
        requiresConfirmation: true,
      },
      confidence: {
        provider: "high",
        cost: "medium",
        booking: "medium",
      },
      nextAction: {
        label: "Open Costco Tire Center",
        url: "https://tires.costco.com/",
      },
    });
    expect(rotation?.intelligence?.actionRecommendation.whyThisOption).toEqual(
      expect.arrayContaining([
        expect.stringContaining("current tire set was installed at Costco"),
        expect.stringContaining("last 3 rotations"),
      ]),
    );
  });

  it("does not require three histories before showing a Rotate Tires recommendation", () => {
    const rotationVisits = loadCarfaxTimelineAsImported()
      .filter((entry) => entry.lineItems.some((lineItem) => /tires rotated/i.test(lineItem)))
      .sort((left, right) => left.mileage - right.mileage);

    const oneRecordBoard = buildOwnerServiceScheduleBoard({
      knowledgeSchedule,
      timeline: rotationVisits.slice(0, 1),
      currentMileage: 6_000,
      effectiveMilesPerYear: 10_000,
      today: "2026-07-30",
      serviceAliasRegistry: aliasRegistry,
    });
    const oneRecord = oneRecordBoard.rows.find((row) => row.entryId === "mm-sub-1");
    expect(oneRecord?.intelligence?.intervalRecommendation.status).toBe("active");
    expect(oneRecord?.intelligence?.intervalRecommendation.evidenceNote).toBe(
      "Last rotation only · no observed gap yet",
    );
    expect(oneRecord?.intelligence?.intervalRecommendation.confidence).toBe("low");

    const twoRecordBoard = buildOwnerServiceScheduleBoard({
      knowledgeSchedule,
      timeline: rotationVisits.slice(0, 2),
      currentMileage: 11_000,
      effectiveMilesPerYear: 10_000,
      today: "2026-07-30",
      serviceAliasRegistry: aliasRegistry,
    });
    const twoRecords = twoRecordBoard.rows.find((row) => row.entryId === "mm-sub-1");
    expect(twoRecords?.intelligence?.intervalRecommendation.status).toBe("active");
    expect(twoRecords?.intelligence?.intervalRecommendation.evidenceNote).toContain(
      "One observed gap",
    );
    expect(twoRecords?.intelligence?.intervalRecommendation.evidenceNote).not.toContain(
      "average",
    );
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
