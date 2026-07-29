import { describe, expect, it } from "vitest";
import type { OwnershipRecordEntry } from "../projections/types.js";
import {
  evaluateOwnershipRenewalDue,
  parseExpirationDate,
  projectOwnershipRenewals,
} from "./evaluate-ownership-renewals.js";

const registrationRecord = (
  overrides: Partial<OwnershipRecordEntry> = {},
): OwnershipRecordEntry => ({
  recordId: "rec-1",
  agency: "Massachusetts RMV (myRMV)",
  recordDate: "2026-01-21",
  mileage: null,
  eventType: "registration",
  description: "Registration active — plate 8ABC123",
  details: [
    "Plate: 8ABC123",
    "Effective Date: 2026-01-21",
    "Expiration Date: 2026-07-21",
    "Status: Active",
  ],
  source: "rmv_import",
  ...overrides,
});

describe("evaluate-ownership-renewals", () => {
  it("parses expiration date from RMV details", () => {
    expect(parseExpirationDate(registrationRecord())).toBe("2026-07-21");
  });

  it("projects due_soon renewals within lead window", () => {
    const renewals = projectOwnershipRenewals({
      ownershipRecords: [registrationRecord()],
      today: "2026-06-01",
    });

    expect(renewals).toHaveLength(1);
    expect(renewals[0]?.status).toBe("due_soon");
    expect(renewals[0]?.title).toBe("Registration renewal");
  });

  it("projects overdue renewals after expiration", () => {
    const renewals = projectOwnershipRenewals({
      ownershipRecords: [registrationRecord()],
      today: "2026-08-01",
    });

    expect(renewals[0]?.status).toBe("overdue");
  });

  it("skips records marked already renewed", () => {
    const renewals = projectOwnershipRenewals({
      ownershipRecords: [
        registrationRecord({
          details: ["Expiration Date: 2026-07-21", "Already Renewed"],
        }),
      ],
      today: "2026-06-01",
    });

    expect(renewals).toHaveLength(0);
  });

  it("returns maintenance recommendation for due renewal", () => {
    const recommendation = evaluateOwnershipRenewalDue({
      state: {
        vehicleId: "veh-1",
        currentMileage: 50_000,
        timeline: [],
        nowQueue: [],
        knowledgeSchedule: [],
        ownershipRecords: [registrationRecord()],
        quoteAnalyses: [],
        evidenceVault: [],
      },
      today: "2026-06-15",
    });

    expect(recommendation?.ruleId).toBe("registration.renewal.ma.v1");
    expect(recommendation?.dueBy).toBe("2026-07-21");
    expect(recommendation?.title).toBe("Registration renewal");
  });
});
