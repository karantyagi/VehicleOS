import { describe, expect, it } from "vitest";
import { deriveOwnershipRecordsFromLineItems } from "./derive-ownership-from-line-items.js";
import { parseExpirationDate } from "./evaluate-ownership-renewals.js";
import { projectOwnershipRenewals } from "./evaluate-ownership-renewals.js";

describe("deriveOwnershipRecordsFromLineItems", () => {
  it("projects inspection renewal from manual chip line item", () => {
    const [record] = deriveOwnershipRecordsFromLineItems({
      lineItems: ["Passed safety inspection"],
      recordDate: "2026-03-01",
      mileage: 58_000,
    });

    expect(record?.eventType).toBe("inspection");
    expect(parseExpirationDate(record!)).toBe("2027-03-01");
  });

  it("feeds schedule renewal projection when due soon", () => {
    const [record] = deriveOwnershipRecordsFromLineItems({
      lineItems: ["Registration renewed"],
      recordDate: "2025-06-01",
      mileage: null,
    });

    const renewals = projectOwnershipRenewals({
      ownershipRecords: [
        {
          recordId: "r1",
          agency: "Massachusetts RMV",
          recordDate: record!.recordDate,
          mileage: record!.mileage,
          eventType: record!.eventType,
          description: record!.description,
          details: record!.details,
          source: "owner_note",
        },
      ],
      today: "2026-07-01",
    });

    expect(renewals[0]?.status).toBe("overdue");
  });
});
