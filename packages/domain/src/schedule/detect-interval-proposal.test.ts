import { describe, expect, it } from "vitest";
import {
  detectIntervalProposalForEntry,
  detectIntervalProposals,
  formatIntervalProposalTaskReason,
} from "./detect-interval-proposal.js";
import type { KnowledgeScheduleEntry, ServiceTimelineEntry } from "../projections/types.js";

const oilEntry: KnowledgeScheduleEntry = {
  entryId: "engine-oil",
  serviceName: "Engine oil",
  intervalMiles: 5_000,
  intervalMonths: 12,
  sourceDocumentId: "doc-1",
  manualTitle: "Manual",
  recordedAt: "2026-01-01T00:00:00.000Z",
};

const oilTimeline: ServiceTimelineEntry[] = [
  {
    serviceId: "svc-1",
    shop: "Dealer",
    serviceDate: "2024-01-01",
    mileage: 10_000,
    lineItems: ["Oil and filter changed"],
    total: "$80",
    evidenceIds: [],
    source: "carfax_import",
  },
  {
    serviceId: "svc-2",
    shop: "Dealer",
    serviceDate: "2024-06-01",
    mileage: 13_000,
    lineItems: ["Synthetic oil change"],
    total: "$85",
    evidenceIds: [],
    source: "carfax_import",
  },
  {
    serviceId: "svc-3",
    shop: "Costco",
    serviceDate: "2024-11-01",
    mileage: 16_000,
    lineItems: ["Engine oil replaced"],
    total: "$45",
    evidenceIds: [],
    source: "carfax_import",
  },
];

describe("detectIntervalProposalForEntry", () => {
  it("proposes a tighter miles habit when spacing is stable and differs from OEM", () => {
    const proposal = detectIntervalProposalForEntry({
      entry: oilEntry,
      timeline: oilTimeline,
    });

    expect(proposal).not.toBeNull();
    expect(proposal?.intervalMiles).toBe(3_000);
    expect(proposal?.entryId).toBe("engine-oil");
    expect(proposal?.source).toBe("heuristic");
  });

  it("skips when overlay already confirmed", () => {
    const proposal = detectIntervalProposalForEntry({
      entry: oilEntry,
      timeline: oilTimeline,
      ownerContextMemory: {
        intervalOverlays: {
          "engine-oil": {
            intervalMiles: 3_000,
            label: "Every 3,000 mi",
            confirmedAt: "2026-07-27T00:00:00.000Z",
          },
        },
      },
    });

    expect(proposal).toBeNull();
  });

  it("skips when spacing matches OEM", () => {
    const proposal = detectIntervalProposalForEntry({
      entry: {
        ...oilEntry,
        intervalMonths: undefined,
      },
      timeline: [
        {
          serviceId: "svc-1",
          shop: "Dealer",
          serviceDate: "2024-01-01",
          mileage: 10_000,
          lineItems: ["Oil change"],
          total: "$80",
          evidenceIds: [],
        },
        {
          serviceId: "svc-2",
          shop: "Dealer",
          serviceDate: "2024-06-01",
          mileage: 15_000,
          lineItems: ["Oil change"],
          total: "$85",
          evidenceIds: [],
        },
      ],
    });

    expect(proposal).toBeNull();
  });

  it("keeps the conservative three-record rule for non-pilot items", () => {
    const proposal = detectIntervalProposalForEntry({
      entry: {
        ...oilEntry,
        intervalMonths: undefined,
      },
      timeline: oilTimeline.slice(0, 2),
    });

    expect(proposal).toBeNull();
  });

  it("does not infer a transmission cadence from a rear differential service", () => {
    const proposal = detectIntervalProposalForEntry({
      entry: {
        entryId: "mm-sub-3",
        canonicalServiceId: "acura.mm.3.transmission_transfer",
        serviceName: "Replace transmission and transfer fluid (Maintenance Minder sub 3)",
        intervalMiles: 30_000,
        intervalMonths: 36,
        sourceDocumentId: "doc-1",
        manualTitle: "2021 Acura TLX Owner's Manual",
        recordedAt: "2026-01-01T00:00:00.000Z",
      },
      timeline: [
        {
          serviceId: "rear-diff",
          shop: "MetroWest Acura",
          serviceDate: "2025-06-11",
          mileage: 44_567,
          lineItems: ["Rear differential fluid flushed/changed"],
          total: "$0.00",
          evidenceIds: [],
          source: "carfax_import",
        },
        {
          serviceId: "transmission",
          shop: "MetroWest Acura",
          serviceDate: "2025-09-15",
          mileage: 49_919,
          lineItems: ["Transmission fluid changed"],
          total: "$0.00",
          evidenceIds: [],
          source: "carfax_import",
        },
      ],
    });

    expect(proposal).toBeNull();
  });

  it("proposes tire rotations from mileage history and ignores elapsed time", () => {
    const proposal = detectIntervalProposalForEntry({
      entry: {
        entryId: "mm-sub-1",
        canonicalServiceId: "generic.tire_rotation",
        serviceName: "Rotate tires (Maintenance Minder sub 1)",
        intervalMiles: 7_500,
        intervalMonths: 12,
        sourceDocumentId: "doc-1",
        manualTitle: "Manual",
        recordedAt: "2026-01-01T00:00:00.000Z",
      },
      timeline: [10_000, 16_000, 22_000].map((mileage, index) => ({
        serviceId: `rotation-${index + 1}`,
        shop: "Tire shop",
        serviceDate: ["2024-01-01", "2024-07-01", "2025-01-01"][index]!,
        mileage,
        lineItems: ["Tire rotation"],
        total: "$0",
        evidenceIds: [],
      })),
    });

    expect(proposal?.intervalKind).toBe("tire_rotation");
    expect(proposal?.intervalMiles).toBe(6_000);
    expect(proposal?.intervalMonths).toBeNull();
    expect(formatIntervalProposalTaskReason(proposal!)).toContain(
      "Assistant recommends 6,000 mi",
    );
    expect(formatIntervalProposalTaskReason(proposal!)).toContain(
      "OEM guidance (7,500 mi / 12 mo) stays on file",
    );
  });

  it("uses one observed tire-rotation gap without calling it a habit", () => {
    const proposal = detectIntervalProposalForEntry({
      entry: {
        entryId: "mm-sub-1",
        canonicalServiceId: "generic.tire_rotation",
        serviceName: "Rotate tires",
        intervalMiles: 7_500,
        intervalMonths: 12,
        sourceDocumentId: "doc-1",
        manualTitle: "Manual",
        recordedAt: "2026-01-01T00:00:00.000Z",
      },
      timeline: [10_000, 16_000].map((mileage, index) => ({
        serviceId: `rotation-${index + 1}`,
        shop: "Tire shop",
        serviceDate: ["2024-01-01", "2024-07-01"][index]!,
        mileage,
        lineItems: ["Tire rotation"],
        total: "$0",
        evidenceIds: [],
      })),
    });

    expect(proposal?.intervalMiles).toBe(6_000);
    expect(proposal?.confidence).toBe(0.55);
    expect(proposal?.evidenceSummary).toBe(
      "One observed rotation gap: 6,000 mi",
    );
    expect(formatIntervalProposalTaskReason(proposal!)).not.toContain("habit");
  });

  it("uses a known tire installation plus one rotation as one interval", () => {
    const proposal = detectIntervalProposalForEntry({
      entry: {
        entryId: "mm-sub-1",
        canonicalServiceId: "generic.tire_rotation",
        serviceName: "Rotate tires",
        intervalMiles: 7_500,
        intervalMonths: 12,
        sourceDocumentId: "doc-1",
        manualTitle: "Manual",
        recordedAt: "2026-01-01T00:00:00.000Z",
      },
      timeline: [
        {
          serviceId: "installation",
          shop: "Tire shop",
          serviceDate: "2025-01-01",
          mileage: 10_000,
          lineItems: ["Four tires installed"],
          total: "$0",
          evidenceIds: [],
        },
        {
          serviceId: "rotation",
          shop: "Tire shop",
          serviceDate: "2025-07-01",
          mileage: 16_000,
          lineItems: ["Tires rotated"],
          total: "$0",
          evidenceIds: [],
        },
      ],
    });

    expect(proposal?.intervalMiles).toBe(6_000);
    expect(proposal?.confidence).toBe(0.55);
    expect(proposal?.evidenceSummary).toBe(
      "One current-tire interval: 6,000 mi",
    );
  });

  it("recommends from variable tire gaps instead of suppressing the pilot", () => {
    const proposal = detectIntervalProposalForEntry({
      entry: {
        entryId: "mm-sub-1",
        canonicalServiceId: "generic.tire_rotation",
        serviceName: "Rotate tires",
        intervalMiles: 7_500,
        intervalMonths: 12,
        sourceDocumentId: "doc-1",
        manualTitle: "Manual",
        recordedAt: "2026-01-01T00:00:00.000Z",
      },
      timeline: [
        {
          serviceId: "old-rotation",
          shop: "Costco",
          serviceDate: "2024-10-01",
          mileage: 37_883,
          lineItems: ["Tires rotated"],
          total: "$0",
          evidenceIds: [],
        },
        {
          serviceId: "installation",
          shop: "Costco",
          serviceDate: "2025-01-06",
          mileage: 39_390,
          lineItems: ["Four tires replaced"],
          total: "$0",
          evidenceIds: [],
        },
        ...[45_243, 53_225, 58_819].map((mileage, index) => ({
          serviceId: `rotation-${index + 1}`,
          shop: "Costco",
          serviceDate: ["2025-04-01", "2025-11-01", "2026-05-01"][index]!,
          mileage,
          lineItems: ["Tires rotated"],
          total: "$0",
          evidenceIds: [],
        })),
      ],
    });

    expect(proposal?.intervalMiles).toBe(6_000);
    expect(proposal?.evidenceSummary).toContain(
      "3 current-tire intervals averaged 6,476 mi",
    );
    expect(proposal?.evidenceSummary).toContain("median 5,853 mi");
  });

  it("does not create a tire proposal from time spacing alone", () => {
    const proposal = detectIntervalProposalForEntry({
      entry: {
        entryId: "mm-sub-1",
        canonicalServiceId: "generic.tire_rotation",
        serviceName: "Rotate tires",
        intervalMiles: 7_500,
        intervalMonths: 12,
        sourceDocumentId: "doc-1",
        manualTitle: "Manual",
        recordedAt: "2026-01-01T00:00:00.000Z",
      },
      timeline: [10_000, 17_500, 25_000].map((mileage, index) => ({
        serviceId: `rotation-${index + 1}`,
        shop: "Tire shop",
        serviceDate: ["2024-01-01", "2024-07-01", "2025-01-01"][index]!,
        mileage,
        lineItems: ["Tire rotation"],
        total: "$0",
        evidenceIds: [],
      })),
    });

    expect(proposal).toBeNull();
  });
});

describe("detectIntervalProposals", () => {
  it("formats owner-facing task reason with OEM reference", () => {
    const [proposal] = detectIntervalProposals({
      knowledgeSchedule: [oilEntry],
      timeline: oilTimeline,
    });

    expect(proposal).toBeDefined();
    expect(formatIntervalProposalTaskReason(proposal!)).toContain("OEM 5,000 mi");
  });
});
