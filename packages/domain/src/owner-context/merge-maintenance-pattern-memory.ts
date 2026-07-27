import type { MaintenanceDeviationReasonId } from "./deviation-reason-options.js";
import { maintenanceDeviationReasonLabel } from "./deviation-reason-options.js";
import type { MaintenancePatternMemory, OwnerContextMemory } from "./types.js";

export const mergeMaintenancePatternMemory = (input: {
  memory?: OwnerContextMemory | null;
  entryId: string;
  timing: "early" | "late";
  reasonId: MaintenanceDeviationReasonId;
  confirmedAt?: string;
}): OwnerContextMemory => {
  const pattern: MaintenancePatternMemory = {
    timing: input.timing,
    reason: maintenanceDeviationReasonLabel(input.reasonId),
    confirmedAt: input.confirmedAt ?? new Date().toISOString(),
  };

  return {
    ...(input.memory ?? {}),
    maintenancePatterns: {
      ...(input.memory?.maintenancePatterns ?? {}),
      [input.entryId]: pattern,
    },
  };
};
