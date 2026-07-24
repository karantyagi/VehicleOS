import { EVENT_TYPES, EVENT_VERSIONS, type VehicleRecordEventType } from "../events/catalog.js";
import { foldEvents } from "../projections/apply.js";
import type { VehicleProjectionState } from "../projections/types.js";
import type { EventStore } from "../ports/event-store.js";

export type VehicleOsRmvRecord = {
  agency: string;
  recordDate: string;
  mileage: number | null;
  eventType: VehicleRecordEventType;
  description: string;
  details: string[];
};

export type RecordVehicleOsRmvImportInput = {
  vehicleId: string;
  importSource: string;
  records: VehicleOsRmvRecord[];
};

export type RecordVehicleOsRmvImportResult = {
  importedCount: number;
  state: VehicleProjectionState;
};

const sortRecordsChronologically = (records: VehicleOsRmvRecord[]): VehicleOsRmvRecord[] =>
  [...records].sort((left, right) => left.recordDate.localeCompare(right.recordDate));

export const recordVehicleOsRmvImport = async (deps: {
  eventStore: EventStore;
  input: RecordVehicleOsRmvImportInput;
}): Promise<RecordVehicleOsRmvImportResult> => {
  const { eventStore, input } = deps;
  const correlationId = crypto.randomUUID();
  const sortedRecords = sortRecordsChronologically(input.records);

  for (const record of sortedRecords) {
    const recordId = crypto.randomUUID();
    await eventStore.append({
      aggregateType: "vehicle",
      aggregateId: input.vehicleId,
      eventType: EVENT_TYPES.VEHICLE_RECORD_RECORDED,
      eventVersion: EVENT_VERSIONS[EVENT_TYPES.VEHICLE_RECORD_RECORDED],
      payload: {
        vehicleId: input.vehicleId,
        recordId,
        agency: record.agency,
        recordDate: record.recordDate,
        mileage: record.mileage,
        eventType: record.eventType,
        description: record.description,
        details: record.details,
        source: "rmv_import",
      },
      correlationId,
    });
  }

  const events = await eventStore.loadAll();
  const vehicleEvents = events.filter(
    (event) => "vehicleId" in event.payload && event.payload.vehicleId === input.vehicleId,
  );

  return {
    importedCount: sortedRecords.length,
    state: foldEvents(input.vehicleId, vehicleEvents),
  };
};
