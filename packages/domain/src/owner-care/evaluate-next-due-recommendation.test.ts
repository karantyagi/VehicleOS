import { describe, expect, it } from "vitest";
import { evaluateNextDueRecommendation } from "./evaluate-next-due-recommendation.js";
import { createEmptyVehicleState } from "../projections/types.js";
import { ONBOARDING_BASELINE_RULE_ID } from "./onboarding-baseline.js";

describe("evaluateNextDueRecommendation", () => {
  it("keeps first-service onboarding when CARFAX only confirms a visit", () => {
    const recommendation = evaluateNextDueRecommendation({
      state: {
        ...createEmptyVehicleState("veh-visit"),
        currentMileage: 6629,
        timeline: [
          {
            serviceId: "visit-1",
            shop: "Genesis of Framingham",
            serviceDate: "2022-12-22",
            mileage: 6629,
            lineItems: ["Service visit"],
            total: "$0.00",
            evidenceIds: [],
            source: "carfax_import",
          },
        ],
      },
      today: "2026-08-02",
    });

    expect(recommendation?.ruleId).toBe(ONBOARDING_BASELINE_RULE_ID);
  });

  it("puts first-service onboarding before an unanchored OEM interval after an RMV import", () => {
    const recommendation = evaluateNextDueRecommendation({
      state: {
        ...createEmptyVehicleState("veh-rmv-only"),
        currentMileage: 56_221,
        knowledgeSchedule: [
          {
            entryId: "code-b",
            serviceName: "Replace engine oil and filter (Maintenance Minder B)",
            intervalMiles: 7_500,
            intervalMonths: 12,
            sourceDocumentId: "acura-tlx-maintenance-minder",
            sourcePage: "Maintenance Minder B",
            manualTitle: "2021 Acura TLX",
            recordedAt: "2026-08-03T00:00:00.000Z",
          },
        ],
        ownershipRecords: [
          {
            recordId: "rmv-registration-1",
            agency: "Massachusetts RMV (myRMV)",
            recordDate: "2026-08-03",
            mileage: 56_221,
            eventType: "registration",
            description: "Registration active",
            details: ["Expiration date: 2027-08-31"],
            source: "rmv_import",
          },
        ],
      },
      today: "2026-08-03",
    });

    expect(recommendation).toMatchObject({
      title: "Log your first service",
      ruleId: ONBOARDING_BASELINE_RULE_ID,
    });
  });

  it("prioritizes ownership overdue ahead of maintenance", () => {
    const recommendation = evaluateNextDueRecommendation({
      state: {
        ...createEmptyVehicleState("veh-1"),
        currentMileage: 34_045,
        knowledgeSchedule: [
          {
            entryId: "oil-change",
            serviceName: "Engine oil and filter",
            intervalMiles: 5_000,
            intervalMonths: 6,
            sourceDocumentId: "doc-1",
            sourcePage: "9-9",
            manualTitle: "2022 Elantra",
            recordedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        timeline: [
          {
            serviceId: "svc-1",
            shop: "Mirak Chevrolet",
            serviceDate: "2025-06-01",
            mileage: 28_000,
            lineItems: ["Oil and filter changed"],
            total: "$0.00",
            evidenceIds: [],
            source: "carfax_import",
          },
        ],
        ownershipRecords: [
          {
            recordId: "reg-1",
            agency: "Massachusetts RMV (myRMV)",
            recordDate: "2026-02-01",
            mileage: null,
            eventType: "registration",
            description: "Registration active — plate 1NST41",
            details: ["Expiration date: 2026-03-01", "Status: Active"],
            source: "rmv_import",
          },
        ],
      },
      today: "2026-07-01",
    });

    expect(recommendation?.ruleId).toBe("registration.renewal.ma.v1");
  });
});
