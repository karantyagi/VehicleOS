import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResearchRunReview } from "./research-cohort-page";
import type { ResearchImportRun } from "@/lib/research-import/types";

const run: ResearchImportRun = {
  id: "run-1",
  source: "carfax-pdf",
  status: "extracted",
  fileName: "karan-carfax.pdf",
  createdAt: "2026-08-04T12:00:00.000Z",
  deleteAfter: "2026-09-03T12:00:00.000Z",
  textCharacterCount: 1_200,
  model: "gpt-5-mini-2025-08-07",
  promptVersion: "research-carfax-contract.v3",
  draft: {
    documentType: "carfax-service-history",
    vehicleVin: null,
    records: [{
      serviceDate: "2026-05-13",
      mileage: 57_160,
      provider: "MetroWest Acura",
      lineItems: ["Vehicle serviced"],
      confidence: 0.6,
      evidence: "Page 1 and 3: specific services not fully visible in summary.",
      evidencePages: [1, 3],
      recordKind: "service",
      reportedBy: "shop",
      serviceDetailStatus: "not-itemized",
      providerLocation: { city: "Framingham", state: "MA", status: "reported", source: "carfax-review-link" },
    }],
    warnings: [],
  },
  ownerDraft: null,
  errorCode: null,
};

describe("ResearchRunReview", () => {
  it("keeps every visit in the review flow while surfacing clear review controls", () => {
    const markup = renderToStaticMarkup(
      <ResearchRunReview run={run} onSave={async () => undefined} />,
    );

    expect(markup).toContain("Review every visit");
    expect(markup).toContain("Needs attention 1");
    expect(markup).toContain("Not reviewed 1");
    expect(markup).toContain("Expand all");
    expect(markup).toContain("Collapse all");
    expect(markup).toContain("Finish review");
    expect(markup).toContain("Review next");
  });
});
