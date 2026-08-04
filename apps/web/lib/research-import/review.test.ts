import { describe, expect, it } from "vitest";
import {
  applyResearchRecordReview,
  isResearchRecordSourceUnverifiable,
  prepareResearchDraftForReview,
  researchRecordAttention,
  researchReviewProgress,
} from "./review.js";
import type { ResearchImportDraft } from "./types.js";

const draft: ResearchImportDraft = {
  documentType: "carfax-service-history",
  vehicleVin: null,
  records: [{
    serviceDate: "2026-07-15",
    mileage: 58_819,
    provider: "Costco Tire Center",
    lineItems: ["Tires rotated"],
    confidence: 0.98,
    evidence: "Page 1: Costco Tire Center, Tires rotated.",
    evidencePages: [1],
    recordKind: "service",
    reportedBy: "shop",
    serviceDetailStatus: "itemized",
    providerLocation: { city: null, state: null, status: "not-reported", source: null },
  }],
  warnings: [],
};

describe("research owner-review protocol", () => {
  it("requires an explicit visit and service-item outcome before a draft is complete", () => {
    const prepared = prepareResearchDraftForReview(draft);
    expect(researchReviewProgress(prepared)).toMatchObject({
      totalVisits: 1,
      reviewedVisits: 0,
      totalServiceItems: 1,
      reviewedServiceItems: 0,
      complete: false,
    });

    const record = prepared.records[0];
    const completed = applyResearchRecordReview(record, {
      visitOutcome: "confirmed",
      serviceItems: [{ originalItem: "Tires rotated", finalItem: "Tires rotated", outcome: "confirmed" }],
    });
    expect(researchReviewProgress({ ...prepared, records: [completed] })).toMatchObject({
      reviewedVisits: 1,
      reviewedServiceItems: 1,
      complete: true,
    });
  });

  it("flags a generic, incomplete source and preserves it as non-evaluative source uncertainty", () => {
    const unclearDraft = prepareResearchDraftForReview({
      ...draft,
      records: [{
        ...draft.records[0],
        provider: "MetroWest Acura",
        lineItems: ["Vehicle serviced"],
        evidence: "Page 1 and 3: specific services not fully visible in summary.",
      }],
    });
    const record = unclearDraft.records[0];
    expect(researchRecordAttention(record).reasons).toContain("The report did not clearly name the work performed.");

    const markedNotItemized = applyResearchRecordReview(record, {
      visitOutcome: "confirmed",
      serviceItems: [{ originalItem: "Vehicle serviced", finalItem: null, outcome: "not-itemized" }],
    });
    expect(researchReviewProgress({ ...unclearDraft, records: [markedNotItemized] }).complete).toBe(true);
    expect(isResearchRecordSourceUnverifiable(markedNotItemized)).toBe(true);
    expect(markedNotItemized.lineItems).toEqual([]);
  });
});
