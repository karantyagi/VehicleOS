import { getServiceAliasRegistry } from "../adapters/service-alias-registry.js";
import { enrichKnowledgeScheduleForVehicle } from "../adapters/enrich-knowledge-schedule-for-vehicle.js";
import {
  EVENT_TYPES,
  EVENT_VERSIONS,
  StubPolicyEngine,
  confirmServiceWithConflictCheck,
  decideTask,
  dedupeKnowledgeScheduleEntries,
  ensureDeviationVerificationPrompts,
  ensureIntervalVerificationPrompts,
  ensureStaleOdometerPrompt,
  foldEvents,
  heuristicReceiptExtract,
  recordVehicleOsImport,
  recordVehicleOsRmvImport,
  refreshMaintenanceRecommendation,
  VERIFIED_PACK_MIN_ENTRIES,
  type EventStore,
  type ExtractedServiceFields,
  type IngestChannel,
  type JobPublisher,
  type OwnerContextMemory,
  type PolicyEngine,
  type RecordServiceInput,
  type TaskDecision,
  type VehicleOsImportService,
  type VehicleOsRmvRecord,
  type VehicleProjectionState,
} from "@vehicleos/domain";
import {
  hydrateOemKnowledgePack,
  type HydrateOemKnowledgePackResult,
} from "@vehicleos/knowledge";

export type GoldenPathDeps = {
  eventStore: EventStore;
  policyEngine?: PolicyEngine;
  jobPublisher?: JobPublisher;
};

export type VehiclePackProfile = {
  year: number;
  make: string;
  model: string;
  trim?: string | null;
};

export type VehicleStateOptions = {
  vehicleCreatedAt?: string;
  ownerContextMemory?: OwnerContextMemory | null;
  ownedSince?: string | null;
  drivingStyle?: import("@vehicleos/domain").DrivingStyle | null;
  statedMilesPerYear?: number | null;
  /** Resolve OEM pack canonicalServiceId for KB rows missing it (pre-ALIAS-1 vehicles). */
  packProfile?: VehiclePackProfile | null;
};

export const createGoldenPathService = (deps: GoldenPathDeps) => {
  const eventStore = deps.eventStore;
  const policyEngine = deps.policyEngine ?? new StubPolicyEngine();
  const jobPublisher = deps.jobPublisher;

  const getVehicleState = async (vehicleId: string, options?: VehicleStateOptions) => {
    const serviceAliasRegistry = getServiceAliasRegistry();

    const loadState = async (): Promise<{
      events: Awaited<ReturnType<typeof loadVehicleEvents>>;
      state: VehicleProjectionState;
    }> => {
      const events = await loadVehicleEvents(eventStore, vehicleId);
      const folded = foldEvents(vehicleId, events);
      return {
        events,
        state: {
          ...folded,
          knowledgeSchedule: dedupeKnowledgeScheduleEntries(
            enrichKnowledgeScheduleForVehicle(folded.knowledgeSchedule, options?.packProfile),
          ),
        },
      };
    };

    if (options?.vehicleCreatedAt) {
      await ensureStaleOdometerPrompt({
        eventStore,
        vehicleId,
        vehicleCreatedAt: options.vehicleCreatedAt,
      });
    }

    let { events, state } = await loadState();

    if (
      options?.packProfile &&
      state.knowledgeSchedule.length < VERIFIED_PACK_MIN_ENTRIES
    ) {
      const hydrateResult = await hydrateOemKnowledgePack({
        eventStore,
        policyEngine,
        vehicle: {
          id: vehicleId,
          year: options.packProfile.year,
          make: options.packProfile.make,
          model: options.packProfile.model,
          trim: options.packProfile.trim ?? "",
          currentMileage: state.currentMileage,
        },
      });

      if (hydrateResult.hydrated) {
        ({ events, state } = await loadState());
      }
    }

    await ensureDeviationVerificationPrompts({
      eventStore,
      vehicleId,
      ownerContextMemory: options?.ownerContextMemory,
      ownedSince: options?.ownedSince,
      drivingStyle: options?.drivingStyle,
      statedMilesPerYear: options?.statedMilesPerYear,
      serviceAliasRegistry,
      knowledgeSchedule: state.knowledgeSchedule,
    });

    await ensureIntervalVerificationPrompts({
      eventStore,
      vehicleId,
      ownerContextMemory: options?.ownerContextMemory,
      serviceAliasRegistry,
      knowledgeSchedule: state.knowledgeSchedule,
    });

    ({ events, state } = await loadState());

    return {
      vehicleId,
      events,
      state,
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

    async queueReceiptExtract(input: {
      vehicleId: string;
      storageKey: string;
      channel?: IngestChannel;
      hintText?: string | null;
      shop?: string;
      serviceDate?: string;
      mileage?: number;
      lineItems?: string[];
      total?: string;
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

      if (jobPublisher && process.env.ENABLE_ASYNC_RECEIPT_EXTRACT === "true") {
        await jobPublisher.publish("extract", {
          vehicleId: input.vehicleId,
          documentId,
          storageKey: input.storageKey,
          channel: input.channel ?? "receipt_upload",
          hintText: input.hintText ?? null,
        });
        return { documentId, correlationId, queued: true as const };
      }

      const extracted = await heuristicReceiptExtract({
        storageKey: input.storageKey,
        channel:
          input.channel === "receipt_upload" || input.channel === "photo" || input.channel === "manual"
            ? input.channel
            : "receipt_upload",
        hintText: input.hintText,
        shop: input.shop,
        serviceDate: input.serviceDate,
        mileage: input.mileage,
        lineItems: input.lineItems,
        total: input.total,
      });

      await eventStore.append({
        aggregateType: "document",
        aggregateId: documentId,
        eventType: EVENT_TYPES.DOCUMENT_EXTRACTION_COMPLETED,
        eventVersion: EVENT_VERSIONS[EVENT_TYPES.DOCUMENT_EXTRACTION_COMPLETED],
        payload: {
          vehicleId: input.vehicleId,
          documentId,
          extracted,
        },
        correlationId,
      });

      return { documentId, correlationId, queued: false as const, extracted };
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

    async decideOnTask(input: {
      vehicleId: string;
      taskId: string;
      decision: TaskDecision;
      snoozeDays?: number;
    }) {
      await decideTask({ eventStore, ...input });
      return getVehicleState(input.vehicleId);
    },

    async refreshMaintenanceRecommendation(input: {
      vehicleId: string;
      ownerContextMemory?: import("@vehicleos/domain").OwnerContextMemory | null;
      drivingStyle?: import("@vehicleos/domain").DrivingStyle | null;
    }) {
      const result = await refreshMaintenanceRecommendation({
        eventStore,
        policyEngine,
        vehicleId: input.vehicleId,
        ownerContextMemory: input.ownerContextMemory,
        drivingStyle: input.drivingStyle,
      });
      const snapshot = await getVehicleState(input.vehicleId);
      return {
        ...result,
        state: snapshot.state,
      };
    },

    async importVehicleOsHistory(input: {
      vehicleId: string;
      importSource: string;
      services: VehicleOsImportService[];
      ownerContextMemory?: OwnerContextMemory | null;
      ownedSince?: string | null;
      drivingStyle?: import("@vehicleos/domain").DrivingStyle | null;
      statedMilesPerYear?: number | null;
      packProfile?: VehiclePackProfile | null;
    }) {
      const importResult = await recordVehicleOsImport({ eventStore, input });
      await refreshMaintenanceRecommendation({
        eventStore,
        policyEngine,
        vehicleId: input.vehicleId,
        ownerContextMemory: input.ownerContextMemory,
        drivingStyle: input.drivingStyle,
      });
      const snapshot = await getVehicleState(input.vehicleId, {
        ownerContextMemory: input.ownerContextMemory,
        ownedSince: input.ownedSince,
        drivingStyle: input.drivingStyle,
        statedMilesPerYear: input.statedMilesPerYear,
        packProfile: input.packProfile,
      });
      return {
        ...importResult,
        state: snapshot.state,
      };
    },

    async importVehicleOsRmvHistory(input: {
      vehicleId: string;
      importSource: string;
      records: VehicleOsRmvRecord[];
    }) {
      const importResult = await recordVehicleOsRmvImport({ eventStore, input });
      await refreshMaintenanceRecommendation({
        eventStore,
        policyEngine,
        vehicleId: input.vehicleId,
      });
      const snapshot = await getVehicleState(input.vehicleId);
      return {
        ...importResult,
        state: snapshot.state,
      };
    },

    async hydrateOemKnowledgePack(input: {
      id: string;
      year: number;
      make: string;
      model: string;
      trim?: string | null;
      currentMileage: number;
    }): Promise<HydrateOemKnowledgePackResult> {
      return hydrateOemKnowledgePack({
        eventStore,
        policyEngine,
        vehicle: input,
      });
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
