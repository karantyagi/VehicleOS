import { describe, expect, it } from "vitest";
import {
  confirmResearchRecord,
  correctResearchRecord,
  isResearchRecordSourceUnverifiable,
  prepareResearchDraftForReview,
  researchRecordAttention,
  researchRecordSourceGuidance,
  researchReviewProgress,
  resetResearchRecordReview,
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
  it("turns one visit confirmation into deterministic completed action labels", () => {
    const prepared = prepareResearchDraftForReview(draft);
    expect(researchReviewProgress(prepared)).toMatchObject({
      totalVisits: 1,
      reviewedVisits: 0,
      totalServiceItems: 1,
      reviewedServiceItems: 0,
      complete: false,
    });

    const completed = confirmResearchRecord(prepared.records[0]);
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
    expect(researchRecordAttention(record).reasons).toContain("CARFAX does not clearly name the work performed for this visit.");

    const markedNotItemized = confirmResearchRecord({ ...record, serviceDetailStatus: "not-itemized" });
    expect(researchReviewProgress({ ...unclearDraft, records: [markedNotItemized] }).complete).toBe(true);
    expect(isResearchRecordSourceUnverifiable(markedNotItemized)).toBe(true);
    expect(markedNotItemized.lineItems).toEqual([]);
  });

  it("derives an actionable source note from validated record fields", () => {
    const sourceLimited = researchRecordSourceGuidance({
      ...draft.records[0],
      lineItems: ["Routine maintenance"],
      serviceDetailStatus: "not-itemized",
    });
    expect(sourceLimited).toMatchObject({
      code: "work-not-itemized",
      title: "CARFAX did not list the exact work",
    });
    expect(sourceLimited?.nextStep).toContain("You do not need to guess or add the missing work.");

    const missingDetails = researchRecordSourceGuidance({
      ...draft.records[0],
      serviceDate: null,
      mileage: null,
    });
    expect(missingDetails).toMatchObject({
      code: "visit-details-missing",
      title: "CARFAX did not show every visit detail",
    });
    expect(missingDetails?.why).toContain("date and mileage");

    expect(researchRecordSourceGuidance({
      ...draft.records[0],
      evidence: "Specific services not fully visible in summary.",
    })?.code).toBe("source-evidence-unclear");
    expect(researchRecordSourceGuidance({
      ...draft.records[0],
      confidence: 0.6,
    })?.code).toBe("low-confidence");
  });

  it("reconciles a compact visit correction into existing evaluation labels", () => {
    const corrected = correctResearchRecord(prepareResearchDraftForReview(draft).records[0], {
      serviceDate: "2026-07-15",
      mileage: 58_819,
      provider: "Costco Tire Center",
      lineItems: ["Tires rotated", "Oil changed"],
    });

    expect(corrected.review).toMatchObject({
      visitOutcome: "corrected",
      serviceItems: [
        { originalItem: "Tires rotated", finalItem: "Tires rotated", outcome: "confirmed" },
        { originalItem: null, finalItem: "Oil changed", outcome: "added" },
      ],
    });
    expect(resetResearchRecordReview(corrected).review?.serviceItems[0]).toMatchObject({
      originalItem: "Tires rotated",
      finalItem: "Tires rotated",
      outcome: "unreviewed",
    });
  });
});
