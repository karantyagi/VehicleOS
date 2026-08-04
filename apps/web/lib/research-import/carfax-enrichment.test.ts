import { describe, expect, it } from "vitest";
import { enrichResearchCarfaxDraft } from "./carfax-enrichment.js";
import type { ResearchImportDraft, ResearchServiceRecord } from "./types.js";

const record = (overrides: Partial<ResearchServiceRecord> = {}): ResearchServiceRecord => ({
  serviceDate: "2026-05-13",
  mileage: 57_160,
  provider: "MetroWest Acura",
  lineItems: ["Vehicle serviced"],
  confidence: 0.9,
  evidence: "MetroWest Acura entry",
  evidencePages: [3, 1, 3],
  recordKind: "unknown",
  reportedBy: "unknown",
  serviceDetailStatus: "unknown",
  providerLocation: { city: "Guessed", state: "MA", status: "reported", source: "record-text" },
  ...overrides,
});

const draft = (records: ResearchServiceRecord[]): ResearchImportDraft => ({
  documentType: "carfax-service-history",
  vehicleVin: null,
  records,
  warnings: [],
});

describe("CARFAX deterministic enrichment", () => {
  it("uses a provider-matched printed CARFAX review link and replaces an unverified model location", () => {
    const enriched = enrichResearchCarfaxDraft(
      draft([record()]),
      "Date 05/13/2026 MetroWest Acura www.carfax.com/Reviews-MetroWest-Acura-Framingham-MA_12345",
    );

    expect(enriched.records[0]).toMatchObject({
      evidencePages: [1, 3],
      recordKind: "service",
      reportedBy: "shop",
      serviceDetailStatus: "not-itemized",
      providerLocation: { city: "Framingham", state: "MA", status: "reported", source: "carfax-review-link" },
    });
  });

  it("keeps location not-reported when the PDF text does not contain a matching printed review link", () => {
    const enriched = enrichResearchCarfaxDraft(draft([record({ provider: "Costco Tire Center" })]), "Costco Tire Center\nTires rotated");
    expect(enriched.records[0].providerLocation).toEqual({ city: null, state: null, status: "not-reported", source: null });
  });

  it("keeps a repeated provider ambiguous when its printed links cannot be tied to one visit", () => {
    const enriched = enrichResearchCarfaxDraft(
      draft([record({ provider: "Jiffy Lube", serviceDate: null })]),
      "www.carfax.com/Reviews-Jiffy-Lube-Nashua-NH_123 www.carfax.com/Reviews-Jiffy-Lube-Maynard-MA_456",
    );
    expect(enriched.records[0].providerLocation).toEqual({ city: null, state: null, status: "ambiguous", source: "carfax-review-link" });
  });

  it("classifies non-maintenance report rows without a second model call", () => {
    const enriched = enrichResearchCarfaxDraft(draft([
      record({ provider: "Massachusetts Motor Vehicle Dept.", lineItems: ["Registration issued"] }),
      record({ provider: "Self-Service (DIY)", lineItems: ["Oil changed"] }),
    ]), "");

    expect(enriched.records.map(({ recordKind, reportedBy, serviceDetailStatus }) => ({ recordKind, reportedBy, serviceDetailStatus }))).toEqual([
      { recordKind: "registration", reportedBy: "government", serviceDetailStatus: "not-applicable" },
      { recordKind: "service", reportedBy: "diy", serviceDetailStatus: "itemized" },
    ]);
  });
});
