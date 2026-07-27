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
