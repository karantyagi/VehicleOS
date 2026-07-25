import { EVENT_TYPES, EVENT_VERSIONS } from "../events/catalog.js";
import type { EventStore } from "../ports/event-store.js";
import type { TieredImportRow } from "./tier-import-rows.js";

export type RecordImportRowVerificationInput = {
  vehicleId: string;
  rows: TieredImportRow[];
  importSource: string;
};

export type RecordImportRowVerificationResult = {
  taskId: string | null;
};

export const recordImportRowVerification = async (deps: {
  eventStore: EventStore;
  input: RecordImportRowVerificationInput;
}): Promise<RecordImportRowVerificationResult> => {
  const { eventStore, input } = deps;
  const verifyRows = input.rows.filter((row) => row.tier === "verify");
  if (verifyRows.length === 0) return { taskId: null };

  const taskId = crypto.randomUUID();
  const correlationId = crypto.randomUUID();
  const reason = verifyRows
    .map(
      (row) =>
        `${row.service.serviceDate} · ${row.service.shop} — ${row.reasons.join(" ") || "Needs confirmation."}`,
    )
    .join(" ");

  await eventStore.append({
    aggregateType: "task",
    aggregateId: taskId,
    eventType: EVENT_TYPES.TASK_CREATED,
    eventVersion: EVENT_VERSIONS[EVENT_TYPES.TASK_CREATED],
    payload: {
      vehicleId: input.vehicleId,
      taskId,
      recommendationId: taskId,
      title: "Verify imported service rows",
      reason,
      status: "pending",
      taskKind: "verification",
      verificationCode: "VERIFY_IMPORT_ROW",
    },
    correlationId,
  });

  return { taskId };
};
