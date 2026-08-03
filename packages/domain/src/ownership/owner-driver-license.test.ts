import { describe, expect, it } from "vitest";
import { InMemoryEventStore } from "../adapters/in-memory-event-store.js";
import { projectOwnerDriverLicenses, recordOwnerDriverLicenses } from "./owner-driver-license.js";

const licenseRow = {
  agency: "Massachusetts RMV (myRMV)",
  recordDate: "2024-04-16",
  mileage: null,
  eventType: "license" as const,
  description: "Driver's license active — Class D",
  details: ["License class: D", "Expiration Date: 2026-10-10"],
};

describe("owner driver license import", () => {
  it("stores a license once for an owner even when it is imported from another vehicle", async () => {
    const eventStore = new InMemoryEventStore();

    const first = await recordOwnerDriverLicenses({ eventStore, ownerId: "owner-1", records: [licenseRow] });
    const second = await recordOwnerDriverLicenses({ eventStore, ownerId: "owner-1", records: [licenseRow] });

    expect(first).toEqual({ importedCount: 1, skippedCount: 0 });
    expect(second).toEqual({ importedCount: 0, skippedCount: 1 });
    expect(projectOwnerDriverLicenses(await eventStore.loadByAggregate("owner", "owner-1"))).toMatchObject([
      { licenseClass: "D", expirationDate: "2026-10-10" },
    ]);
  });
});
