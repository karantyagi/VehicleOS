import { EVENT_TYPES, EVENT_VERSIONS } from "../events/catalog.js";
import { foldEvents } from "../projections/apply.js";
import type { ServiceTimelineEntry, VehicleProjectionState } from "../projections/types.js";
import type { EventStore } from "../ports/event-store.js";

export type PossibleServiceDuplicate = {
  firstServiceId: string;
  secondServiceId: string;
  dayDistance: number;
  matchingLineItems: string[];
};

export type MergeServiceRecordsInput = {
  vehicleId: string;
  targetServiceId: string;
  mergedServiceId: string;
  lineItems?: string[];
};

const normalizeLineItem = (value: string): string =>
  value.trim().toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");

const calendarDay = (isoDate: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000;
};

const uniqueText = (values: string[]): string[] => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizeLineItem(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const usefulTotal = (total: string): boolean => {
  const value = Number(total.replace(/[$,\s]/g, ""));
  return Number.isFinite(value) && value > 0;
};

/**
 * Transparent, conservative reconciliation rule for owner review.
 * A pair is only suggested when it has the same odometer, is at most one
 * calendar day apart, and contains at least one identical normalized line item.
 * It never merges automatically.
 */
export const findPossibleServiceDuplicates = (
  timeline: ServiceTimelineEntry[],
): PossibleServiceDuplicate[] => {
  const candidates: PossibleServiceDuplicate[] = [];

  for (let firstIndex = 0; firstIndex < timeline.length; firstIndex += 1) {
    const first = timeline[firstIndex]!;
    const firstDay = calendarDay(first.serviceDate);
    if (firstDay === null) continue;

    for (let secondIndex = firstIndex + 1; secondIndex < timeline.length; secondIndex += 1) {
      const second = timeline[secondIndex]!;
      if (first.mileage !== second.mileage) continue;

      const secondDay = calendarDay(second.serviceDate);
      if (secondDay === null) continue;
      const dayDistance = Math.abs(firstDay - secondDay);
      if (dayDistance > 1) continue;

      const secondItems = new Set(second.lineItems.map(normalizeLineItem));
      const matchingLineItems = uniqueText(
        first.lineItems.filter((lineItem) => secondItems.has(normalizeLineItem(lineItem))),
      );
      if (matchingLineItems.length === 0) continue;

      candidates.push({
        firstServiceId: first.serviceId,
        secondServiceId: second.serviceId,
        dayDistance,
        matchingLineItems,
      });
    }
  }

  return candidates;
};

export const mergeServiceRecords = async (deps: {
  eventStore: EventStore;
  input: MergeServiceRecordsInput;
}): Promise<{ state: VehicleProjectionState }> => {
  const { eventStore, input } = deps;
  if (input.targetServiceId === input.mergedServiceId) {
    throw new Error("Choose two different service records to merge.");
  }

  const events = await eventStore.loadAll();
  const vehicleEvents = events.filter(
    (event) => "vehicleId" in event.payload && event.payload.vehicleId === input.vehicleId,
  );
  const state = foldEvents(input.vehicleId, vehicleEvents);
  const target = state.timeline.find((entry) => entry.serviceId === input.targetServiceId);
  const merged = state.timeline.find((entry) => entry.serviceId === input.mergedServiceId);
  if (!target || !merged) {
    throw new Error("Service record not found.");
  }
  const lineItems = uniqueText(
    input.lineItems ?? [...target.lineItems, ...merged.lineItems],
  );
  if (lineItems.length === 0) {
    throw new Error("Keep at least one line item in the merged record.");
  }

  await eventStore.append({
    aggregateType: "vehicle",
    aggregateId: input.vehicleId,
    eventType: EVENT_TYPES.SERVICE_MERGED,
    eventVersion: EVENT_VERSIONS[EVENT_TYPES.SERVICE_MERGED],
    payload: {
      vehicleId: input.vehicleId,
      targetServiceId: input.targetServiceId,
      mergedServiceId: input.mergedServiceId,
      lineItems,
      evidenceIds: [...new Set([...target.evidenceIds, ...merged.evidenceIds])],
      total: usefulTotal(target.total) ? target.total : merged.total,
      strategy: "owner_confirmed",
    },
    correlationId: crypto.randomUUID(),
  });

  const nextEvents = await eventStore.loadAll();
  const nextVehicleEvents = nextEvents.filter(
    (event) => "vehicleId" in event.payload && event.payload.vehicleId === input.vehicleId,
  );

  return { state: foldEvents(input.vehicleId, nextVehicleEvents) };
};
