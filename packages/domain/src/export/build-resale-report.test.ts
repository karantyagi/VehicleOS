import { describe, expect, it } from "vitest";
import { buildResaleReport } from "./build-resale-report.js";
import { formatResaleReportMarkdown } from "./format-resale-report-markdown.js";
import { createEmptyVehicleState } from "../projections/types.js";

describe("buildResaleReport", () => {
  it("packages timeline, vault, and quote history for export", () => {
    const state = createEmptyVehicleState("veh-1");
    state.currentMileage = 42_000;
    state.timeline = [
      {
        serviceId: "svc-2",
        shop: "Dealer",
        serviceDate: "2026-02-01",
        mileage: 42_000,
        lineItems: ["Oil change"],
        total: "$89.00",
        evidenceIds: ["doc-2"],
      },
      {
        serviceId: "svc-1",
        shop: "Jiffy Lube",
        serviceDate: "2026-01-12",
        mileage: 41_800,
        lineItems: ["Oil change", "Filter replaced"],
        total: "$67.42",
        evidenceIds: ["doc-1"],
      },
    ];
    state.evidenceVault = [
      {
        documentId: "doc-1",
        storageKey: "user/veh/receipt-1.pdf",
        channel: "receipt_upload",
        ingestedAt: "2026-01-12T12:00:00.000Z",
        immutable: true,
      },
    ];
    state.quoteAnalyses = [
      {
        quoteId: "quote-1",
        summary: "One line looks high.",
        totalQuoted: 149,
        totalFairHigh: 120,
        analyzedAt: "2026-02-10T10:00:00.000Z",
        lines: [
          {
            description: "Oil change",
            quotedAmount: 149,
            fairMin: 45,
            fairMax: 95,
            verdict: "high",
            reason: "Above typical range.",
          },
        ],
      },
    ];

    const report = buildResaleReport({
      vehicle: {
        id: "veh-1",
        vin: "TEST-VIN",
        year: 2019,
        make: "Honda",
        model: "Civic",
        currentMileage: 42_000,
      },
      exportedAt: "2026-07-21T00:00:00.000Z",
      state,
    });

    expect(report.kind).toBe("VehicleOSResaleReport.v1");
    expect(report.timeline.map((entry) => entry.serviceId)).toEqual(["svc-1", "svc-2"]);
    expect(report.summary).toMatchObject({
      serviceCount: 2,
      evidenceCount: 1,
      earliestServiceDate: "2026-01-12",
      latestServiceDate: "2026-02-01",
      lowestRecordedMileage: 41_800,
      highestRecordedMileage: 42_000,
    });
    expect(report.evidenceVault).toHaveLength(1);
    expect(report.quoteAnalyses).toHaveLength(1);
  });
});

describe("formatResaleReportMarkdown", () => {
  it("renders a buyer-facing markdown report", () => {
    const report = buildResaleReport({
      vehicle: {
        id: "veh-1",
        vin: "TEST-VIN",
        year: 2019,
        make: "Honda",
        model: "Civic",
        currentMileage: 41_800,
      },
      state: {
        ...createEmptyVehicleState("veh-1"),
        currentMileage: 41_800,
        timeline: [
          {
            serviceId: "svc-1",
            shop: "Jiffy Lube",
            serviceDate: "2026-01-12",
            mileage: 41_800,
            lineItems: ["Oil change"],
            total: "$67.42",
            evidenceIds: ["doc-1"],
          },
        ],
        evidenceVault: [
          {
            documentId: "doc-1",
            storageKey: "user/veh/receipt-1.pdf",
            channel: "receipt_upload",
            ingestedAt: "2026-01-12T12:00:00.000Z",
            immutable: true,
          },
        ],
      },
      exportedAt: "2026-07-21T00:00:00.000Z",
    });

    const markdown = formatResaleReportMarkdown(report);

    expect(markdown).toContain("# Vehicle OS resale evidence report");
    expect(markdown).toContain("**VIN:** TEST-VIN");
    expect(markdown).toContain("Jiffy Lube");
    expect(markdown).toContain("doc-1");
  });
});
