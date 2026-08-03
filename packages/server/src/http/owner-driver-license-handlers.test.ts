import { describe, expect, it } from "vitest";
import { InMemoryEventStore, projectOwnerDriverLicenses } from "@vehicleos/domain";
import { InMemoryVehicleRepository } from "../repositories/in-memory-vehicle-repository.js";
import { createApiServices } from "../services/index.js";
import { saveOwnerDriverLicense } from "./owner-driver-license-handlers.js";

describe("owner driver-license handlers", () => {
  it("saves a manual deadline on the owner aggregate", async () => {
    const eventStore = new InMemoryEventStore();
    const services = createApiServices({
      eventStore,
      vehicles: new InMemoryVehicleRepository(),
    });

    const response = await saveOwnerDriverLicense(services, {
      jurisdiction: "MA",
      agency: "Massachusetts RMV",
      expirationDate: "2026-09-15",
    }, { userId: "owner-1" });

    expect(response.status).toBe(201);
    expect(projectOwnerDriverLicenses(
      await eventStore.loadByAggregate("owner", "owner-1"),
    )).toMatchObject([{
      expirationDate: "2026-09-15",
      source: "owner_note",
    }]);
  });

  it("rejects calendar-invalid dates", async () => {
    const services = createApiServices({
      eventStore: new InMemoryEventStore(),
      vehicles: new InMemoryVehicleRepository(),
    });

    const response = await saveOwnerDriverLicense(services, {
      jurisdiction: "MA",
      expirationDate: "2026-02-31",
    }, { userId: "owner-1" });

    expect(response.status).toBe(400);
  });
});
