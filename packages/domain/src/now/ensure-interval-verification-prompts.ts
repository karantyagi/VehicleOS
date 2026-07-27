import { EVENT_TYPES, EVENT_VERSIONS } from "../events/catalog.js";
import { foldEvents } from "../projections/apply.js";
import type { EventStore } from "../ports/event-store.js";
import type { OwnerContextMemory } from "../owner-context/types.js";
import type { KnowledgeScheduleEntry } from "../projections/types.js";
import type { ServiceAliasRegistry } from "../knowledge/service-alias-registry.js";
import {
  detectIntervalProposals,
  formatIntervalProposalTaskReason,
  formatIntervalProposalTaskTitle,
} from "../schedule/detect-interval-proposal.js";
import { intervalRuleIdForEntry } from "../schedule/interval-rule-id.js";

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

export type EnsureIntervalVerificationPromptsInput = {
  eventStore: EventStore;
  vehicleId: string;
  ownerContextMemory?: OwnerContextMemory | null;
  serviceAliasRegistry?: ServiceAliasRegistry | null;
  knowledgeSchedule?: KnowledgeScheduleEntry[];
};

export type EnsureIntervalVerificationPromptsResult = {
  createdCount: number;
  nowQueue: ReturnType<typeof foldEvents>["nowQueue"];
};

export const ensureIntervalVerificationPrompts = async (
  input: EnsureIntervalVerificationPromptsInput,
): Promise<EnsureIntervalVerificationPromptsResult> => {
  const events = await loadVehicleEvents(input.eventStore, input.vehicleId);
  const state = foldEvents(input.vehicleId, events);

  const proposals = detectIntervalProposals({
    knowledgeSchedule: input.knowledgeSchedule ?? state.knowledgeSchedule,
    timeline: state.timeline,
    ownerContextMemory: input.ownerContextMemory,
    serviceAliasRegistry: input.serviceAliasRegistry,
  });

  let createdCount = 0;

  for (const proposal of proposals) {
    const ruleId = intervalRuleIdForEntry(proposal.entryId);
    const hasPendingPrompt = state.nowQueue.some(
      (item) =>
        item.status === "pending" &&
        item.taskKind === "verification" &&
        item.ruleId === ruleId,
    );

    if (hasPendingPrompt) continue;

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
        title: formatIntervalProposalTaskTitle(proposal),
        reason: formatIntervalProposalTaskReason(proposal),
        status: "pending",
        taskKind: "verification",
        verificationCode: "VERIFY_OWNER_INTERVAL",
        ruleId,
        suggestedIntervalMiles: proposal.intervalMiles ?? undefined,
        suggestedIntervalMonths: proposal.intervalMonths ?? undefined,
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
