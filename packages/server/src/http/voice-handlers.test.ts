import { describe, expect, it } from "vitest";
import { EVENT_TYPES, InMemoryEventStore } from "@vehicleos/domain";
import { InMemoryVehicleRepository } from "../repositories/in-memory-vehicle-repository.js";
import { createApiServices } from "../services/index.js";
import { submitVoiceMemory } from "./voice-handlers.js";

const createOwnedVehicle = async (vehicles: InMemoryVehicleRepository) =>
  vehicles.create({
    userId: "owner-1",
    vin: "19UUB6F47MA008400",
    year: 2021,
    make: "Acura",
    model: "TLX",
    currentMileage: 58_819,
  });

describe("submitVoiceMemory", () => {
  it("records a typed service note with manual evidence and owner-note provenance", async () => {
    const eventStore = new InMemoryEventStore();
    const vehicles = new InMemoryVehicleRepository();
    const vehicle = await createOwnedVehicle(vehicles);
    const services = createApiServices({ eventStore, vehicles });

    const response = await submitVoiceMemory(
      services,
      vehicle.id,
      {
        transcript: "Changed oil at dealer, 62,200 miles, $110",
        storageKey: "owners/owner-1/vehicles/tlx/service-note.txt",
        captureChannel: "text",
      },
      { userId: "owner-1" },
    );

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ captureChannel: "text" });

    const events = await eventStore.loadAll();
    expect(events.find((event) => event.eventType === EVENT_TYPES.DOCUMENT_INGESTED)?.payload)
      .toMatchObject({ channel: "manual" });
    expect(events.find((event) => event.eventType === EVENT_TYPES.SERVICE_RECORDED)?.payload)
      .toMatchObject({ source: "owner_note", mileage: 62_200 });
  });

  it("retains voice provenance when browser dictation fills the service-note field", async () => {
    const eventStore = new InMemoryEventStore();
    const vehicles = new InMemoryVehicleRepository();
    const vehicle = await createOwnedVehicle(vehicles);
    const services = createApiServices({ eventStore, vehicles });

    const response = await submitVoiceMemory(
      services,
      vehicle.id,
      {
        transcript: "Changed oil at dealer, 62,200 miles, $110",
        storageKey: "owners/owner-1/vehicles/tlx/voice-note.txt",
        captureChannel: "voice",
      },
      { userId: "owner-1" },
    );

    expect(response.status).toBe(201);

    const events = await eventStore.loadAll();
    expect(events.find((event) => event.eventType === EVENT_TYPES.DOCUMENT_INGESTED)?.payload)
      .toMatchObject({ channel: "voice" });
    expect(events.find((event) => event.eventType === EVENT_TYPES.SERVICE_RECORDED)?.payload)
      .toMatchObject({ source: "voice" });
  });

  it("rejects an unsupported capture channel before writing a document or service", async () => {
    const eventStore = new InMemoryEventStore();
    const vehicles = new InMemoryVehicleRepository();
    const vehicle = await createOwnedVehicle(vehicles);
    const services = createApiServices({ eventStore, vehicles });

    const response = await submitVoiceMemory(
      services,
      vehicle.id,
      {
        transcript: "Changed oil at dealer, 62,200 miles, $110",
        storageKey: "owners/owner-1/vehicles/tlx/service-note.txt",
        captureChannel: "audio" as never,
      },
      { userId: "owner-1" },
    );

    expect(response.status).toBe(400);
    expect(await eventStore.loadAll()).toHaveLength(0);
  });
});
