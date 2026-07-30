import { EVENT_TYPES, EVENT_VERSIONS } from "../events/catalog.js";
import { foldEvents } from "../projections/apply.js";
import type { EventStore } from "../ports/event-store.js";
import type { VehicleProjectionState } from "../projections/types.js";
import { addDays, formatIsoDate } from "./format-owner-deadline.js";

export const STALE_ODOMETER_RULE_ID = "assistant.policy.odometer_stale.v1";
export const STALE_ODOMETER_DAYS = 30;
export const DEFAULT_SNOOZE_DAYS = 14;

const loadVehicleEvents = async (
  eventStore: EventStore,
  vehicleId: string,
): Promise<Awaited<ReturnType<EventStore["loadAll"]>>> => {
  if ("loadForVehicle" in eventStore && typeof eventStore.loadForVehicle === "function") {
    return eventStore.loadForVehicle(vehicleId);
  }

  const allEvents = await eventStore.loadAll();
  return allEvents.filter(
    (event) => "vehicleId" in event.payload && event.payload.vehicleId === vehicleId,
  );
};

export const resolveLastMileageTouchDate = (input: {
  state: VehicleProjectionState;
  vehicleCreatedAt?: string | null;
}): string => {
  const timelineDates = input.state.timeline.map((entry) => entry.serviceDate);
  const ownershipDates = input.state.ownershipRecords
    .map((record) => record.recordDate)
    .filter(Boolean);

  const candidates = [...timelineDates, ...ownershipDates];
  if (input.vehicleCreatedAt) candidates.push(input.vehicleCreatedAt.slice(0, 10));

  if (candidates.length === 0) {
    return new Date().toISOString().slice(0, 10);
  }

  return candidates.sort((a, b) => b.localeCompare(a))[0]!;
};

const parseIsoMidday = (value: string): Date => new Date(`${value}T12:00:00.000Z`);

export const isOdometerStale = (input: {
  state: VehicleProjectionState;
  vehicleCreatedAt?: string | null;
  today?: string;
}): boolean => {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const lastTouch = resolveLastMileageTouchDate(input);
  const daysSince = Math.round(
    (parseIsoMidday(today).getTime() - parseIsoMidday(lastTouch).getTime()) / (1000 * 60 * 60 * 24),
  );
  return daysSince >= STALE_ODOMETER_DAYS;
};

export type EnsureStaleOdometerPromptInput = {
  eventStore: EventStore;
  vehicleId: string;
  vehicleCreatedAt?: string | null;
  today?: string;
};

export type EnsureStaleOdometerPromptResult = {
  created: boolean;
  nowQueue: ReturnType<typeof foldEvents>["nowQueue"];
};

export const ensureStaleOdometerPrompt = async (
  input: EnsureStaleOdometerPromptInput,
): Promise<EnsureStaleOdometerPromptResult> => {
  const events = await loadVehicleEvents(input.eventStore, input.vehicleId);
  const state = foldEvents(input.vehicleId, events);

  const hasUnresolvedPrompt = state.nowQueue.some(
    (item) =>
      (item.status === "pending" || item.status === "snoozed") &&
      item.taskKind === "verification" &&
      item.ruleId === STALE_ODOMETER_RULE_ID,
  );

  if (hasUnresolvedPrompt || !isOdometerStale({ state, vehicleCreatedAt: input.vehicleCreatedAt, today: input.today })) {
    return { created: false, nowQueue: state.nowQueue };
  }

  const lastTouch = resolveLastMileageTouchDate({ state, vehicleCreatedAt: input.vehicleCreatedAt });
  const taskId = crypto.randomUUID();
  const correlationId = crypto.randomUUID();

  await input.eventStore.append({
    aggregateType: "task",
    aggregateId: taskId,
    eventType: EVENT_TYPES.TASK_CREATED,
    eventVersion: EVENT_VERSIONS[EVENT_TYPES.TASK_CREATED],
    payload: {
      vehicleId: input.vehicleId,
      taskId,
      recommendationId: correlationId,
      title: "What's your current mileage?",
      reason: `Haven't updated mileage since ${lastTouch}. Enter your odometer — takes a few seconds — so maintenance timing stays accurate.`,
      status: "pending",
      taskKind: "verification",
      verificationCode: "VERIFY_ODOMETER",
      ruleId: STALE_ODOMETER_RULE_ID,
    },
    correlationId,
  });

  const nextEvents = await loadVehicleEvents(input.eventStore, input.vehicleId);
  return {
    created: true,
    nowQueue: foldEvents(input.vehicleId, nextEvents).nowQueue,
  };
};

export const computeSnoozeUntil = (today: string, snoozeDays: number): string =>
  addDays(today, snoozeDays);

export const todayIsoDate = (): string => formatIsoDate(new Date());
