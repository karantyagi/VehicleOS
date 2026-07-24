import { describe, expect, it } from "vitest";
import { InMemoryEventStore } from "../adapters/in-memory-event-store.js";
import { projectMaintenanceSchedule } from "../schedule/project-maintenance-schedule.js";
import { recordVehicleOsImport } from "./record-vehicleos-import.js";

describe("recordVehicleOsImport", () => {
  it("records CARFAX services with carfax_import source for schedule baselines", async () => {
    const eventStore = new InMemoryEventStore();
    const vehicleId = "veh-1";

    const result = await recordVehicleOsImport({
      eventStore,
      input: {
        vehicleId,
        importSource: "carfax-connect-cli",
        services: [
          {
            shop: "Jiffy Lube",
            serviceDate: "2024-06-01",
            mileage: 30_000,
            lineItems: ["Oil change (synthetic)", "Filter replaced"],
            total: "$62.00",
          },
          {
            shop: "Dealer",
            serviceDate: "2026-01-12",
            mileage: 41_800,
            lineItems: ["Oil change (synthetic)"],
            total: "$67.42",
          },
        ],
      },
    });

    expect(result.importedCount).toBe(2);
    expect(result.state.timeline).toHaveLength(2);
    expect(result.state.timeline.every((row) => row.source === "carfax_import")).toBe(true);

    const schedule = projectMaintenanceSchedule({
      knowledgeSchedule: [
        {
          entryId: "oil-1",
          serviceName: "Engine oil & filter",
          intervalMonths: 6,
          intervalMiles: 5_000,
          sourceDocumentId: "doc-1",
          manualTitle: "Owner manual",
          recordedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      timeline: result.state.timeline,
      currentMileage: 42_000,
      ownedSince: "2023-01-01",
      today: "2026-07-23",
      horizonMode: "extended",
    });

    expect(schedule.rows[0]?.serviceBaseline.baselineSource).toBe("carfax");
    expect(schedule.rows[0]?.serviceBaseline.performedDate).toBe("2026-01-12");
  });

  it("skips duplicate services on re-import", async () => {
    const eventStore = new InMemoryEventStore();
    const vehicleId = "veh-dedupe";

    const first = await recordVehicleOsImport({
      eventStore,
      input: {
        vehicleId,
        importSource: "carfax-connect-cli",
        services: [
          {
            shop: "Dealer",
            serviceDate: "2026-01-12",
            mileage: 41_800,
            lineItems: ["Oil change"],
            total: "$67.42",
          },
        ],
      },
    });

    expect(first.importedCount).toBe(1);
    expect(first.skippedCount).toBe(0);

    const second = await recordVehicleOsImport({
      eventStore,
      input: {
        vehicleId,
        importSource: "carfax-connect-cli",
        services: [
          {
            shop: "Dealer",
            serviceDate: "2026-01-12",
            mileage: 41_800,
            lineItems: ["Oil change (synthetic)"],
            total: "$67.42",
          },
        ],
      },
    });

    expect(second.importedCount).toBe(0);
    expect(second.skippedCount).toBe(1);
    expect(second.state.timeline).toHaveLength(1);
  });
});
