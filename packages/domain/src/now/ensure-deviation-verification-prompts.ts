import { EVENT_TYPES, EVENT_VERSIONS } from "../events/catalog.js";
import { foldEvents } from "../projections/apply.js";
import type { EventStore } from "../ports/event-store.js";
import type { OwnerContextMemory } from "../owner-context/types.js";
import type { DrivingStyle } from "../schedule/resolve-schedule-projection-context.js";
import { resolveScheduleProjectionContext } from "../schedule/resolve-schedule-projection-context.js";
import { projectMaintenanceSchedule } from "../schedule/project-maintenance-schedule.js";
import { projectMaintenanceDeviations } from "../schedule/project-maintenance-deviations.js";
import { deviationRuleIdForEntry } from "../schedule/deviation-rule-id.js";
import {
  formatDraftDeviationTaskReason,
  heuristicDraftDeviationReason,
} from "../owner-context/draft-deviation-reason.js";

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

export type EnsureDeviationVerificationPromptsInput = {
  eventStore: EventStore;
  vehicleId: string;
  ownerContextMemory?: OwnerContextMemory | null;
  ownedSince?: string | null;
  drivingStyle?: DrivingStyle | null;
  statedMilesPerYear?: number | null;
  today?: string;
};

export type EnsureDeviationVerificationPromptsResult = {
  createdCount: number;
  nowQueue: ReturnType<typeof foldEvents>["nowQueue"];
};

export const ensureDeviationVerificationPrompts = async (
  input: EnsureDeviationVerificationPromptsInput,
): Promise<EnsureDeviationVerificationPromptsResult> => {
  const events = await loadVehicleEvents(input.eventStore, input.vehicleId);
  const state = foldEvents(input.vehicleId, events);
  const today = input.today ?? new Date().toISOString().slice(0, 10);

  const scheduleContext = resolveScheduleProjectionContext({
    ownedSince: input.ownedSince ?? null,
    drivingStyle: input.drivingStyle ?? null,
    statedMilesPerYear: input.statedMilesPerYear ?? null,
    timeline: state.timeline,
  });

  const schedule = projectMaintenanceSchedule({
    knowledgeSchedule: state.knowledgeSchedule,
    timeline: state.timeline,
    currentMileage: state.currentMileage,
    effectiveMilesPerYear: scheduleContext.effectiveMilesPerYear,
    ownedSince: scheduleContext.ownedSince,
    today,
    horizonMode: "extended",
    ownerContextMemory: input.ownerContextMemory,
  });

  const deviations = projectMaintenanceDeviations({
    scheduleRows: schedule.rows,
    ownerContextMemory: input.ownerContextMemory,
  }).filter((deviation) => !deviation.hasConfirmedPattern);

  let createdCount = 0;

  for (const deviation of deviations) {
    const ruleId = deviationRuleIdForEntry(deviation.entryId);
    const hasPendingPrompt = state.nowQueue.some(
      (item) =>
        item.status === "pending" &&
        item.taskKind === "verification" &&
        item.ruleId === ruleId,
    );

    if (hasPendingPrompt) continue;

    const taskId = crypto.randomUUID();
    const correlationId = crypto.randomUUID();

    const draft = heuristicDraftDeviationReason({
      deviation,
      ownerContextMemory: input.ownerContextMemory,
      drivingStyle: input.drivingStyle,
      timeline: state.timeline,
    });

    await input.eventStore.append({
      aggregateType: "task",
      aggregateId: taskId,
      eventType: EVENT_TYPES.TASK_CREATED,
      eventVersion: EVENT_VERSIONS[EVENT_TYPES.TASK_CREATED],
      payload: {
        vehicleId: input.vehicleId,
        taskId,
        recommendationId: correlationId,
        title: `${deviation.serviceName} — done ${deviation.oemTiming === "early" ? "early" : "late"}`,
        reason: formatDraftDeviationTaskReason({ deviation, draft }),
        status: "pending",
        taskKind: "verification",
        verificationCode: "VERIFY_MAINTENANCE_TIMING",
        ruleId,
        suggestedReasonId: draft.suggestedReasonId,
        draftReasonSource: draft.source,
      },
      correlationId,
    });

    createdCount += 1;
  }

  const nextEvents = await loadVehicleEvents(input.eventStore, input.vehicleId);
  return {
    createdCount,
    nowQueue: foldEvents(input.vehicleId, nextEvents).nowQueue,
  };
};
