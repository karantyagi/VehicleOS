import { EVENT_TYPES, EVENT_VERSIONS } from "../events/catalog.js";
import { foldEvents } from "../projections/apply.js";
import type { VehicleProjectionState } from "../projections/types.js";
import type { EventStore } from "../ports/event-store.js";

export type ServiceRecordPatch = {
  shop?: string;
  shopLocation?: string | null;
  serviceDate?: string;
  mileage?: number;
  lineItems?: string[];
  total?: string;
};

export type UpdateServiceRecordInput = {
  vehicleId: string;
  serviceId: string;
  patch: ServiceRecordPatch;
};

export type UpdateServiceRecordResult = {
  state: VehicleProjectionState;
};

const hasPatchValues = (patch: ServiceRecordPatch): boolean =>
  Object.values(patch).some((value) => value !== undefined);

export const updateServiceRecord = async (deps: {
  eventStore: EventStore;
  input: UpdateServiceRecordInput;
}): Promise<UpdateServiceRecordResult> => {
  const { eventStore, input } = deps;
  if (!hasPatchValues(input.patch)) {
    throw new Error("At least one field is required to update a service record.");
  }

  const events = await eventStore.loadAll();
  const vehicleEvents = events.filter(
    (event) => "vehicleId" in event.payload && event.payload.vehicleId === input.vehicleId,
  );
  const state = foldEvents(input.vehicleId, vehicleEvents);
  const existing = state.timeline.find((entry) => entry.serviceId === input.serviceId);
  if (!existing) {
    throw new Error("Service record not found.");
  }

  await eventStore.append({
    aggregateType: "vehicle",
    aggregateId: input.vehicleId,
    eventType: EVENT_TYPES.SERVICE_UPDATED,
    eventVersion: EVENT_VERSIONS[EVENT_TYPES.SERVICE_UPDATED],
    payload: {
      vehicleId: input.vehicleId,
      serviceId: input.serviceId,
      ...input.patch,
    },
    correlationId: crypto.randomUUID(),
  });

  const nextEvents = await eventStore.loadAll();
  const nextVehicleEvents = nextEvents.filter(
    (event) => "vehicleId" in event.payload && event.payload.vehicleId === input.vehicleId,
  );

  return {
    state: foldEvents(input.vehicleId, nextVehicleEvents),
  };
};
