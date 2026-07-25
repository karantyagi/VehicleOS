import { EVENT_TYPES, EVENT_VERSIONS } from "../events/catalog.js";
import type { EventStore } from "../ports/event-store.js";
import type { ProfileImportConflict } from "./reconcile-import-vehicle-profile.js";

export type RecordProfileImportVerificationInput = {
  vehicleId: string;
  conflicts: ProfileImportConflict[];
  importSource: string;
};

export type RecordProfileImportVerificationResult = {
  taskId: string | null;
};

export const recordProfileImportVerification = async (deps: {
  eventStore: EventStore;
  input: RecordProfileImportVerificationInput;
}): Promise<RecordProfileImportVerificationResult> => {
  const { eventStore, input } = deps;
  if (input.conflicts.length === 0) return { taskId: null };

  const taskId = crypto.randomUUID();
  const correlationId = crypto.randomUUID();
  const reason = input.conflicts.map((conflict) => conflict.message).join(" ");

  await eventStore.append({
    aggregateType: "task",
    aggregateId: taskId,
    eventType: EVENT_TYPES.TASK_CREATED,
    eventVersion: EVENT_VERSIONS[EVENT_TYPES.TASK_CREATED],
    payload: {
      vehicleId: input.vehicleId,
      taskId,
      recommendationId: taskId,
      title: "Verify vehicle record vs import",
      reason,
      status: "pending",
      taskKind: "verification",
      verificationCode: "VERIFY_VEHICLE_PROFILE",
    },
    correlationId,
  });

  return { taskId };
};
