import { describe, expect, it } from "vitest";
import {
  acceptImportRowAsReportedMessage,
  evaluateImportReviewVerdict,
} from "./import-review-verdict.js";

describe("evaluateImportReviewVerdict", () => {
  it("returns clear when tier is no longer verify after mileage fix", () => {
    const verdict = evaluateImportReviewVerdict({
      tier: "auto",
      ownerGuidance: [],
      priorGuidanceCodes: ["mileage_cross_day"],
    });
    expect(verdict.status).toBe("clear");
    expect(verdict.message).toMatch(/mileage/i);
  });

  it("returns still flagged when mileage issue remains", () => {
    const verdict = evaluateImportReviewVerdict({
      tier: "verify",
      ownerGuidance: [{ code: "mileage_cross_day" }],
    });
    expect(verdict.status).toBe("still_flagged");
    expect(verdict.message).toMatch(/mileage/i);
  });

  it("returns clear when location was the only issue and is fixed", () => {
    const verdict = evaluateImportReviewVerdict({
      tier: "enriched",
      ownerGuidance: [],
      priorGuidanceCodes: ["missing_shop_location"],
    });
    expect(verdict.status).toBe("clear");
    expect(verdict.message).toMatch(/shop location/i);
  });

  it("accept message is owner friendly", () => {
    expect(acceptImportRowAsReportedMessage()).toMatch(/CARFAX/i);
  });
});
