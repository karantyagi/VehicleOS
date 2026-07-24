import { describe, expect, it } from "vitest";
import { InMemoryEventStore } from "../adapters/in-memory-event-store.js";
import { recordVehicleOsRmvImport } from "./record-vehicleos-rmv-import.js";

describe("recordVehicleOsRmvImport", () => {
  it("records RMV ownership events separately from maintenance timeline", async () => {
    const eventStore = new InMemoryEventStore();
    const vehicleId = "veh-rmv-1";

    const result = await recordVehicleOsRmvImport({
      eventStore,
      input: {
        vehicleId,
        importSource: "rmv-pdf-manual",
        records: [
          {
            agency: "Massachusetts RMV",
            recordDate: "2026-01-21",
            mileage: null,
            eventType: "title",
            description: "Title issued or updated",
            details: ["Title issued or updated", "Vehicle color noted as Gray"],
          },
        ],
      },
    });

    expect(result.importedCount).toBe(1);
    expect(result.state.ownershipRecords).toHaveLength(1);
    expect(result.state.timeline).toHaveLength(0);
    expect(result.state.ownershipRecords[0]?.source).toBe("rmv_import");
  });
});
