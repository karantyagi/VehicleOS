import { describe, expect, it } from "vitest";
import {
  enrichTimelineForDisplay,
  resolveServiceSource,
  serviceSourceLabel,
  sortTimelineEntries,
} from "./timeline-view.js";

describe("timeline view", () => {
  it("sorts entries newest-first by service date", () => {
    const sorted = sortTimelineEntries([
      {
        serviceId: "a",
        shop: "Shop",
        serviceDate: "2025-01-01",
        mileage: 10_000,
        lineItems: ["Oil change"],
        total: "$40",
        evidenceIds: [],
      },
      {
        serviceId: "b",
        shop: "Shop",
        serviceDate: "2026-02-01",
        mileage: 20_000,
        lineItems: ["Tire rotation"],
        total: "$30",
        evidenceIds: [],
      },
    ]);

    expect(sorted.map((entry) => entry.serviceId)).toEqual(["b", "a"]);
  });

  it("derives receipt source from vault channel", () => {
    const source = resolveServiceSource(
      {
        serviceId: "svc",
        shop: "Jiffy Lube",
        serviceDate: "2026-01-01",
        mileage: 12_000,
        lineItems: ["Oil change"],
        total: "$45",
        evidenceIds: ["doc-1"],
      },
      [
        {
          documentId: "doc-1",
          storageKey: "key",
          channel: "receipt_upload",
          ingestedAt: "2026-01-01T00:00:00.000Z",
          immutable: true,
        },
      ],
    );

    expect(source).toBe("receipt");
    expect(serviceSourceLabel(source)).toBe("Receipt");
  });

  it("enriches explicit owner and dealer sources", () => {
    const timeline = enrichTimelineForDisplay(
      [
        {
          serviceId: "owner",
          shop: "Owner noted",
          serviceDate: "2026-03-01",
          mileage: 15_000,
          lineItems: ["Skipped cabin filter"],
          total: "$0.00",
          evidenceIds: [],
          source: "owner_note",
        },
        {
          serviceId: "dealer",
          shop: "Honda dealer",
          serviceDate: "2026-04-01",
          mileage: 16_000,
          lineItems: ["Oil change"],
          total: "$89",
          evidenceIds: [],
          source: "dealer",
        },
      ],
      [],
    );

    expect(timeline[0]?.source).toBe("dealer");
    expect(timeline[1]?.source).toBe("owner_note");
  });
});
