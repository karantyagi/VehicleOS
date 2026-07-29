import { describe, expect, it } from "vitest";
import { evaluateNextDueRecommendation } from "./evaluate-next-due-recommendation.js";
import { createEmptyVehicleState } from "../projections/types.js";

describe("evaluateNextDueRecommendation", () => {
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
