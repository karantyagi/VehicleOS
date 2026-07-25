import { EVENT_TYPES, EVENT_VERSIONS } from "../events/catalog.js";
import { foldEvents } from "../projections/apply.js";
import type { VehicleProjectionState } from "../projections/types.js";
import type { EventStore } from "../ports/event-store.js";
import { filterNewImportServices } from "./dedupe-import-rows.js";

export type VehicleOsImportService = {
  shop: string;
  shopLocation?: string;
  serviceDate: string;
  mileage: number;
  lineItems: string[];
  total: string;
  evidenceIds?: string[];
};

export type RecordVehicleOsImportInput = {
  vehicleId: string;
  importSource: string;
  services: VehicleOsImportService[];
};

export type RecordVehicleOsImportResult = {
  importedCount: number;
  skippedCount: number;
  state: VehicleProjectionState;
};

const sortServicesChronologically = (
  services: VehicleOsImportService[],
): VehicleOsImportService[] =>
  [...services].sort((left, right) => {
    const dateCompare = left.serviceDate.localeCompare(right.serviceDate);
    if (dateCompare !== 0) return dateCompare;
    return left.mileage - right.mileage;
  });

export const recordVehicleOsImport = async (deps: {
  eventStore: EventStore;
  input: RecordVehicleOsImportInput;
}): Promise<RecordVehicleOsImportResult> => {
  const { eventStore, input } = deps;
  const correlationId = crypto.randomUUID();

  const events = await eventStore.loadAll();
  const vehicleEvents = events.filter(
    (event) => "vehicleId" in event.payload && event.payload.vehicleId === input.vehicleId,
  );
  const existingState = foldEvents(input.vehicleId, vehicleEvents);

  const { newRows, skippedCount } = filterNewImportServices(existingState.timeline, input.services);
  const sortedServices = sortServicesChronologically(newRows);

  for (const service of sortedServices) {
    const serviceId = crypto.randomUUID();
    await eventStore.append({
      aggregateType: "vehicle",
      aggregateId: input.vehicleId,
      eventType: EVENT_TYPES.SERVICE_RECORDED,
      eventVersion: EVENT_VERSIONS[EVENT_TYPES.SERVICE_RECORDED],
      payload: {
        vehicleId: input.vehicleId,
        serviceId,
        shop: service.shop,
        shopLocation: service.shopLocation,
        serviceDate: service.serviceDate,
        mileage: service.mileage,
        lineItems: service.lineItems,
        total: service.total,
        evidenceIds: service.evidenceIds ?? [],
        source: "carfax_import",
      },
      correlationId,
    });
  }

  const nextEvents = await eventStore.loadAll();
  const nextVehicleEvents = nextEvents.filter(
    (event) => "vehicleId" in event.payload && event.payload.vehicleId === input.vehicleId,
  );

  return {
    importedCount: sortedServices.length,
    skippedCount,
    state: foldEvents(input.vehicleId, nextVehicleEvents),
  };
};
