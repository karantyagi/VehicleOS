import type { MaintenancePatternMemory, OwnerContextMemory } from "../owner-context/types.js";
import type { ScheduleProjectionRow } from "./project-maintenance-schedule.js";

export type MaintenanceDeviationRecord = {
  entryId: string;
  serviceName: string;
  oemTiming: "early" | "late";
  performedDate: string | null;
  dueDate: string | null;
  baselineSource: ScheduleProjectionRow["serviceBaseline"]["baselineSource"];
  hasConfirmedPattern: boolean;
  confirmedPattern?: MaintenancePatternMemory;
};

export const projectMaintenanceDeviations = (input: {
  scheduleRows: ScheduleProjectionRow[];
  ownerContextMemory?: OwnerContextMemory | null;
}): MaintenanceDeviationRecord[] => {
  const patterns = input.ownerContextMemory?.maintenancePatterns ?? {};

  return input.scheduleRows.flatMap((row) => {
    if (row.oemTiming !== "early" && row.oemTiming !== "late") return [];

    const confirmedPattern = patterns[row.entryId];

    return [
      {
        entryId: row.entryId,
        serviceName: row.serviceName,
        oemTiming: row.oemTiming,
        performedDate: row.serviceBaseline.performedDate,
        dueDate: row.dueDate,
        baselineSource: row.serviceBaseline.baselineSource,
        hasConfirmedPattern: Boolean(confirmedPattern),
        confirmedPattern,
      },
    ];
  });
};
