import { EVENT_TYPES, EVENT_VERSIONS } from "../events/catalog.js";
import type { EventStore } from "../ports/event-store.js";
import { foldEvents } from "../projections/apply.js";
import { intervalRuleIdForEntry } from "../schedule/interval-rule-id.js";
import type { OwnerHabitProposalV1 } from "./types.js";
import { validateOwnerHabitProposal } from "./parse-owner-habit-note.js";

const loadVehicleEvents = async (eventStore: EventStore, vehicleId: string) => {
  if ("loadForVehicle" in eventStore && typeof eventStore.loadForVehicle === "function") {
    return eventStore.loadForVehicle(vehicleId);
  }
  return (await eventStore.loadAll()).filter(
    (event) => "vehicleId" in event.payload && event.payload.vehicleId === vehicleId,
  );
};

const intervalLabel = (proposal: OwnerHabitProposalV1): string => {
  const parts: string[] = [];
  if (proposal.intervalMiles !== null) parts.push(`${proposal.intervalMiles.toLocaleString("en-US")} mi`);
  if (proposal.intervalMonths !== null) parts.push(`${proposal.intervalMonths} mo`);
  return parts.join(" / ");
};

export const recordOwnerHabitProposal = async (input: {
  eventStore: EventStore;
  vehicleId: string;
  proposal: OwnerHabitProposalV1;
}): Promise<{ taskId: string; created: boolean }> => {
  const validationError = validateOwnerHabitProposal(input.proposal);
  if (validationError) throw new Error(validationError);

  const ruleId = intervalRuleIdForEntry(input.proposal.entryId);
  const events = await loadVehicleEvents(input.eventStore, input.vehicleId);
  const pending = foldEvents(input.vehicleId, events).nowQueue.find(
    (item) => item.status === "pending" && item.ruleId === ruleId,
  );
  if (pending) return { taskId: pending.taskId, created: false };

  const taskId = crypto.randomUUID();
  const correlationId = crypto.randomUUID();
  const quoted = input.proposal.sourceText.length > 180
    ? `${input.proposal.sourceText.slice(0, 177)}…`
    : input.proposal.sourceText;

  await input.eventStore.append({
    aggregateType: "task",
    aggregateId: taskId,
    eventType: EVENT_TYPES.TASK_CREATED,
    eventVersion: EVENT_VERSIONS[EVENT_TYPES.TASK_CREATED],
    payload: {
      vehicleId: input.vehicleId,
      taskId,
      recommendationId: correlationId,
      title: `${input.proposal.serviceName} — every ${intervalLabel(input.proposal)}?`,
      reason: `You said: “${quoted}” Confirm or edit this owner interval before it changes the schedule. OEM truth stays unchanged.`,
      status: "pending",
      taskKind: "verification",
      verificationCode: "VERIFY_OWNER_INTERVAL",
      ruleId,
      suggestedIntervalMiles: input.proposal.intervalMiles ?? undefined,
      suggestedIntervalMonths: input.proposal.intervalMonths ?? undefined,
      intervalKind: "general",
    },
    correlationId,
  });

  return { taskId, created: true };
};
