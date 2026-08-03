import { describe, expect, it } from "vitest";
import { InMemoryEventStore } from "@vehicleos/domain";
import { InMemoryVehicleRepository } from "../repositories/in-memory-vehicle-repository.js";
import { createApiServices } from "../services/index.js";
import { submitOwnerHabit } from "./owner-habit-handlers.js";

describe("submitOwnerHabit", () => {
  it("turns owner text into a review task without changing the schedule immediately", async () => {
    const vehicles = new InMemoryVehicleRepository();
    const vehicle = await vehicles.create({
      userId: "owner-1",
      vin: "19UUB6F47MA008400",
      year: 2021,
      make: "Acura",
      model: "TLX",
      currentMileage: 58_819,
    });
    const services = createApiServices({ eventStore: new InMemoryEventStore(), vehicles });

    const result = await submitOwnerHabit(
      services,
      vehicle.id,
      { text: "I add Chevron Techron every 3,000 miles", captureChannel: "text" },
      { userId: "owner-1" },
    );

    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({
      created: true,
      proposal: { entryId: "owner-habit:techron", intervalMiles: 3_000 },
    });
    expect((result.body as { verifications: unknown[] }).verifications).toHaveLength(1);
  });
});
