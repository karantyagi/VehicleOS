import { describe, expect, it } from "vitest";
import { buildOwnerHistoryTimeline } from "./build-owner-history-timeline.js";

describe("buildOwnerHistoryTimeline", () => {
  it("merges service and ownership records chronologically", () => {
    const items = buildOwnerHistoryTimeline({
      timeline: [
        {
          serviceId: "svc-1",
          shop: "Mirak Chevrolet",
          serviceDate: "2025-12-20",
          mileage: 34_045,
          lineItems: ["Oil and filter changed"],
          total: "$0.00",
          evidenceIds: [],
          source: "carfax_import",
          carfaxImport: {
            sourceTrust: "provider",
            locationEvidence: { status: "geoapify", location: "Boston, MA" },
          },
        },
      ],
      ownershipRecords: [
        {
          recordId: "rmv-1",
          agency: "Massachusetts RMV (myRMV)",
          recordDate: "2026-01-15",
          mileage: null,
          eventType: "title",
          description: "Title active — CM161923",
          details: ["Title Number: CM161923"],
          source: "rmv_import",
        },
      ],
    });

    expect(items).toHaveLength(2);
    expect(items[0]?.kind).toBe("ownership");
    expect(items[1]?.kind).toBe("service");
    expect(items[1]?.carfaxImport).toEqual({
      sourceTrust: "provider",
      locationEvidence: { status: "geoapify", location: "Boston, MA" },
    });
  });
});
