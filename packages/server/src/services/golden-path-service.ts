import {
  EVENT_TYPES,
  EVENT_VERSIONS,
  StubPolicyEngine,
  confirmServiceWithConflictCheck,
  decideTask,
  foldEvents,
  refreshMaintenanceRecommendation,
  type EventStore,
  type ExtractedServiceFields,
  type IngestChannel,
  type PolicyEngine,
  type RecordServiceInput,
  type TaskDecision,
} from "@vehicleos/domain";

export type GoldenPathDeps = {
  eventStore: EventStore;
  policyEngine?: PolicyEngine;
};

export const createGoldenPathService = (deps: GoldenPathDeps) => {
  const eventStore = deps.eventStore;
  const policyEngine = deps.policyEngine ?? new StubPolicyEngine();

  const getVehicleState = async (vehicleId: string) => {
    const events = await loadVehicleEvents(eventStore, vehicleId);
    return {
      vehicleId,
      events,
      state: foldEvents(vehicleId, events),
    };
  };

  return {
    async ingestReceipt(input: {
      vehicleId: string;
      storageKey: string;
      channel?: IngestChannel;
    }) {
      const documentId = crypto.randomUUID();
      const correlationId = crypto.randomUUID();

      await eventStore.append({
        aggregateType: "document",
        aggregateId: documentId,
        eventType: EVENT_TYPES.DOCUMENT_INGESTED,
        eventVersion: EVENT_VERSIONS[EVENT_TYPES.DOCUMENT_INGESTED],
        payload: {
          vehicleId: input.vehicleId,
          documentId,
          channel: input.channel ?? "receipt_upload",
          storageKey: input.storageKey,
        },
        correlationId,
      });

      return { documentId, correlationId };
    },

    async completeExtraction(input: {
      vehicleId: string;
      documentId: string;
      extracted: ExtractedServiceFields;
      correlationId?: string;
    }) {
      await eventStore.append({
        aggregateType: "document",
        aggregateId: input.documentId,
        eventType: EVENT_TYPES.DOCUMENT_EXTRACTION_COMPLETED,
        eventVersion: EVENT_VERSIONS[EVENT_TYPES.DOCUMENT_EXTRACTION_COMPLETED],
        payload: {
          vehicleId: input.vehicleId,
          documentId: input.documentId,
          extracted: input.extracted,
        },
        correlationId: input.correlationId,
      });

      return input.extracted;
    },

    async confirmService(input: RecordServiceInput) {
      return confirmServiceWithConflictCheck({ eventStore, policyEngine, input });
    },

    getVehicleState,

    async decideOnTask(input: { vehicleId: string; taskId: string; decision: TaskDecision }) {
      await decideTask({ eventStore, ...input });
      return getVehicleState(input.vehicleId);
    },

    async refreshMaintenanceRecommendation(input: { vehicleId: string }) {
      const result = await refreshMaintenanceRecommendation({
        eventStore,
        policyEngine,
        vehicleId: input.vehicleId,
      });
      const snapshot = await getVehicleState(input.vehicleId);
      return {
        ...result,
        state: snapshot.state,
      };
    },
  };
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

export type GoldenPathService = ReturnType<typeof createGoldenPathService>;
