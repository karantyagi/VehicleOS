import { EVENT_TYPES, EVENT_VERSIONS } from "../events/catalog.js";
import { foldEvents } from "../projections/apply.js";
import type { ServiceTimelineEntry, VehicleProjectionState } from "../projections/types.js";
import type { EventStore } from "../ports/event-store.js";
import { isVisitOnlyServiceRecord } from "./service-record-kind.js";

export const POSSIBLE_DUPLICATE_MAX_DAY_DISTANCE = 10;
export const POSSIBLE_DUPLICATE_MIN_MILEAGE_DISTANCE = 100;
export const POSSIBLE_DUPLICATE_MAX_MILEAGE_DISTANCE = 500;

export type PossibleServiceDuplicate = {
  firstServiceId: string;
  secondServiceId: string;
  confidence: "strong" | "possible";
  dayDistance: number;
  mileageDistance: number;
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

const normalizeWorkToken = (token: string): string => {
  if (token === "changed") return "change";
  if (token === "replaced") return "replace";
  if (token === "rotated") return "rotation";
  if (token === "inspected") return "inspection";
  if (token === "checked") return "check";
  if (token.endsWith("s") && token.length > 3) return token.slice(0, -1);
  return token;
};

const WORK_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "completed",
  "full",
  "service",
  "synthetic",
  "the",
  "vehicle",
]);

const meaningfulWorkTokens = (lineItem: string): Set<string> =>
  new Set(
    normalizeLineItem(lineItem)
      .split(" ")
      .map(normalizeWorkToken)
      .filter((token) => token.length > 1 && !WORK_STOP_WORDS.has(token)),
  );

const hasSimilarWork = (first: string, second: string): boolean => {
  if (normalizeLineItem(first) === normalizeLineItem(second)) return true;
  const firstTokens = meaningfulWorkTokens(first);
  const secondTokens = meaningfulWorkTokens(second);
  let sharedTokenCount = 0;
  for (const token of firstTokens) {
    if (secondTokens.has(token)) sharedTokenCount += 1;
  }
  return sharedTokenCount >= 2;
};

const normalizeShop = (shop: string): string => normalizeLineItem(shop);

const isOwnerEnteredSource = (source: ServiceTimelineEntry["source"]): boolean =>
  source === "owner_note" || source === "voice";

const isExternalEvidenceSource = (source: ServiceTimelineEntry["source"]): boolean =>
  source === "carfax_import" || source === "dealer" || source === "receipt";

const areSourcesOrShopsCompatible = (
  first: ServiceTimelineEntry,
  second: ServiceTimelineEntry,
): boolean =>
  normalizeShop(first.shop) === normalizeShop(second.shop) ||
  (isOwnerEnteredSource(first.source) && isExternalEvidenceSource(second.source)) ||
  (isOwnerEnteredSource(second.source) && isExternalEvidenceSource(first.source));

const possibleMileageDistance = (firstMileage: number, secondMileage: number): number =>
  Math.max(
    POSSIBLE_DUPLICATE_MIN_MILEAGE_DISTANCE,
    Math.min(
      POSSIBLE_DUPLICATE_MAX_MILEAGE_DISTANCE,
      Math.round(Math.max(firstMileage, secondMileage) * 0.01),
    ),
  );

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

const matchingLineItems = (first: ServiceTimelineEntry, second: ServiceTimelineEntry): string[] => {
  const secondItems = new Set(second.lineItems.map(normalizeLineItem));
  return uniqueText(
    first.lineItems.filter((lineItem) => secondItems.has(normalizeLineItem(lineItem))),
  );
};

const similarLineItems = (first: ServiceTimelineEntry, second: ServiceTimelineEntry): string[] =>
  uniqueText(
    first.lineItems.filter((firstLineItem) =>
      second.lineItems.some((secondLineItem) => hasSimilarWork(firstLineItem, secondLineItem)),
    ),
  );

const usefulTotal = (total: string): boolean => {
  const value = Number(total.replace(/[$,\s]/g, ""));
  return Number.isFinite(value) && value > 0;
};

/**
 * Transparent reconciliation suggestions for owner review. Strong candidates
 * retain the exact prior rule. Possible candidates allow a delayed CARFAX or
 * owner entry, but require compatible sources/shops and similar performed work.
 * Neither tier ever merges automatically.
 */
export const findPossibleServiceDuplicates = (
  timeline: ServiceTimelineEntry[],
): PossibleServiceDuplicate[] => {
  const candidates: PossibleServiceDuplicate[] = [];
  const maintenanceTimeline = timeline.filter((entry) => !isVisitOnlyServiceRecord(entry));

  for (let firstIndex = 0; firstIndex < maintenanceTimeline.length; firstIndex += 1) {
    const first = maintenanceTimeline[firstIndex]!;
    const firstDay = calendarDay(first.serviceDate);
    if (firstDay === null) continue;

    for (let secondIndex = firstIndex + 1; secondIndex < maintenanceTimeline.length; secondIndex += 1) {
      const second = maintenanceTimeline[secondIndex]!;

      const secondDay = calendarDay(second.serviceDate);
      if (secondDay === null) continue;
      const dayDistance = Math.abs(firstDay - secondDay);
      const mileageDistance = Math.abs(first.mileage - second.mileage);
      const exactMatches = matchingLineItems(first, second);

      if (
        mileageDistance === 0 &&
        dayDistance <= 1 &&
        exactMatches.length > 0
      ) {
        candidates.push({
          firstServiceId: first.serviceId,
          secondServiceId: second.serviceId,
          confidence: "strong",
          dayDistance,
          mileageDistance,
          matchingLineItems: exactMatches,
        });
        continue;
      }

      if (
        dayDistance > POSSIBLE_DUPLICATE_MAX_DAY_DISTANCE ||
        mileageDistance > possibleMileageDistance(first.mileage, second.mileage) ||
        !areSourcesOrShopsCompatible(first, second)
      ) {
        continue;
      }

      const similarMatches = similarLineItems(first, second);
      if (similarMatches.length === 0) continue;

      candidates.push({
        firstServiceId: first.serviceId,
        secondServiceId: second.serviceId,
        confidence: "possible",
        dayDistance,
        mileageDistance,
        matchingLineItems: similarMatches,
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
  const isProposedPair = findPossibleServiceDuplicates(state.timeline).some(
    (candidate) =>
      (candidate.firstServiceId === target.serviceId &&
        candidate.secondServiceId === merged.serviceId) ||
      (candidate.firstServiceId === merged.serviceId &&
        candidate.secondServiceId === target.serviceId),
  );
  if (!isProposedPair) {
    throw new Error("These records are not a conservative duplicate candidate.");
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
