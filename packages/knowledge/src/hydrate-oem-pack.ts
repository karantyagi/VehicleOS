import { foldEvents } from "@vehicleos/domain";
import type { EventStore, PolicyEngine } from "@vehicleos/domain";
import { dedupeKnowledgeScheduleEntries, recordKnowledgeSchedule, VERIFIED_PACK_MIN_ENTRIES } from "@vehicleos/domain";
import {
  loadOemSchedulePack,
  loadSupportedVehicleCatalog,
  packToKnowledgeScheduleDraft,
  resolvePackIdForVehicle,
} from "./load-catalog.js";

export type HydrateOemKnowledgePackInput = {
  eventStore: EventStore;
  policyEngine: PolicyEngine;
  vehicle: {
    id: string;
    year: number;
    make: string;
    model: string;
    trim?: string | null;
    currentMileage: number;
  };
};

export type HydrateOemKnowledgePackResult = {
  hydrated: boolean;
  packId?: string;
  entriesRecorded?: number;
  skippedReason?: "unsupported" | "not_auto_verified" | "already_hydrated";
  upgradedFromStub?: boolean;
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

export const hydrateOemKnowledgePack = async (
  input: HydrateOemKnowledgePackInput,
): Promise<HydrateOemKnowledgePackResult> => {
  const packId = resolvePackIdForVehicle({
    make: input.vehicle.make,
    model: input.vehicle.model,
    year: input.vehicle.year,
    trim: input.vehicle.trim ?? "",
  });

  if (!packId) {
    return { hydrated: false, skippedReason: "unsupported" };
  }

  const catalog = loadSupportedVehicleCatalog();
  const catalogRow = catalog.vehicles.find((row) => row.packId === packId);
  if (!catalogRow || catalogRow.qaStatus !== "auto_verified") {
    return { hydrated: false, packId, skippedReason: "not_auto_verified" };
  }

  const events = await loadVehicleEvents(input.eventStore, input.vehicle.id);
  const state = foldEvents(input.vehicle.id, events);
  const effectiveSchedule = dedupeKnowledgeScheduleEntries(state.knowledgeSchedule);

  const pack = loadOemSchedulePack(packId);
  const entries = packToKnowledgeScheduleDraft(pack);

  if (effectiveSchedule.length >= VERIFIED_PACK_MIN_ENTRIES) {
    return { hydrated: false, packId, skippedReason: "already_hydrated" };
  }

  const upgradedFromStub = effectiveSchedule.length > 0;

  const result = await recordKnowledgeSchedule({
    eventStore: input.eventStore,
    policyEngine: input.policyEngine,
    vehicleId: input.vehicle.id,
    storageKey: `catalog/packs/${packId}.v1.json`,
    manualTitle: pack.manualTitle,
    entries,
    currentMileage: input.vehicle.currentMileage,
    openRecommendationIfDue: false,
  });

  return {
    hydrated: true,
    packId,
    entriesRecorded: result.entriesRecorded,
    upgradedFromStub,
  };
};
