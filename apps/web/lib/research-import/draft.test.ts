import { describe, expect, it } from "vitest";
import { parseResearchImportDraft } from "./draft.js";

const legacyDraft = {
  documentType: "carfax-service-history",
  vehicleVin: null,
  records: [{
    serviceDate: "2026-05-13",
    mileage: 57_160,
    provider: "MetroWest Acura",
    lineItems: ["Vehicle serviced"],
    confidence: 0.9,
    evidence: "Page 1",
  }],
  warnings: [],
};

describe("research draft schema compatibility", () => {
  it("normalizes stored v1 drafts so a participant can still review them", () => {
    expect(parseResearchImportDraft(legacyDraft)?.records[0]).toMatchObject({
      evidencePages: [],
      recordKind: "unknown",
      reportedBy: "unknown",
      serviceDetailStatus: "unknown",
      providerLocation: { city: null, state: null, status: "not-reported", source: null },
    });
  });

  it("rejects malformed source-grounding fields when they are present", () => {
    expect(parseResearchImportDraft({
      ...legacyDraft,
      records: [{ ...legacyDraft.records[0], evidencePages: [0] }],
    })).toBeNull();
  });
});
