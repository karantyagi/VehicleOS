import { EVENT_TYPES, EVENT_VERSIONS } from "../events/catalog.js";
import { filterNewOwnershipRecords } from "../import/dedupe-import-rows.js";
import { foldEvents } from "../projections/apply.js";
import type { VehicleProjectionState } from "../projections/types.js";
import type { EventStore } from "../ports/event-store.js";
import {
  deriveOwnershipRecordsFromLineItems,
  type DerivedOwnershipRecord,
} from "./derive-ownership-from-line-items.js";

export type RecordOwnershipFromServiceNoteInput = {
  vehicleId: string;
  lineItems: string[];
  recordDate: string;
  mileage: number | null;
};

export type RecordOwnershipFromServiceNoteResult = {
  importedCount: number;
  skippedCount: number;
  state: VehicleProjectionState;
};

const loadVehicleEvents = async (eventStore: EventStore, vehicleId: string) => {
  if ("loadForVehicle" in eventStore && typeof eventStore.loadForVehicle === "function") {
    return eventStore.loadForVehicle(vehicleId);
  }

  const allEvents = await eventStore.loadAll();
  return allEvents.filter(
    (event) => "vehicleId" in event.payload && event.payload.vehicleId === vehicleId,
  );
};

export const recordOwnershipFromServiceNote = async (deps: {
  eventStore: EventStore;
  input: RecordOwnershipFromServiceNoteInput;
}): Promise<RecordOwnershipFromServiceNoteResult> => {
  const derived = deriveOwnershipRecordsFromLineItems({
    lineItems: deps.input.lineItems,
    recordDate: deps.input.recordDate,
    mileage: deps.input.mileage,
  });

  if (derived.length === 0) {
    const events = await loadVehicleEvents(deps.eventStore, deps.input.vehicleId);
    return {
      importedCount: 0,
      skippedCount: 0,
      state: foldEvents(deps.input.vehicleId, events),
    };
  }

  const events = await loadVehicleEvents(deps.eventStore, deps.input.vehicleId);
  const existingState = foldEvents(deps.input.vehicleId, events);

  const incoming: DerivedOwnershipRecord[] = derived;
  const { newRows, skippedCount } = filterNewOwnershipRecords(
    existingState.ownershipRecords,
    incoming,
  );

  const correlationId = crypto.randomUUID();

  for (const record of newRows) {
    const recordId = crypto.randomUUID();
    await deps.eventStore.append({
      aggregateType: "vehicle",
      aggregateId: deps.input.vehicleId,
      eventType: EVENT_TYPES.VEHICLE_RECORD_RECORDED,
      eventVersion: EVENT_VERSIONS[EVENT_TYPES.VEHICLE_RECORD_RECORDED],
      payload: {
        vehicleId: deps.input.vehicleId,
        recordId,
        agency: record.agency,
        recordDate: record.recordDate,
        mileage: record.mileage,
        eventType: record.eventType,
        description: record.description,
        details: record.details,
        source: "owner_note",
      },
      correlationId,
    });
  }

  const nextEvents = await loadVehicleEvents(deps.eventStore, deps.input.vehicleId);

  return {
    importedCount: newRows.length,
    skippedCount,
    state: foldEvents(deps.input.vehicleId, nextEvents),
  };
};
