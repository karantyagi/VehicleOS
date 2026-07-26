import type { SupportedVehicleRow } from "./types.js";
import {
  formatScheduleSourceLine,
  shouldDiscloseScheduleSource,
  type ScheduleSourceRegistryRow,
} from "./schedule-source-line.js";

export const resolveScheduleSourceLineForPack = (
  packId: string,
  catalogVehicles: SupportedVehicleRow[],
  registryByPackId: Map<string, ScheduleSourceRegistryRow>,
): string | null => {
  const vehicle = catalogVehicles.find((row) => row.packId === packId);
  if (!vehicle) return null;

  const source = registryByPackId.get(packId);
  if (!shouldDiscloseScheduleSource(source)) return null;

  const sharedVehicle = catalogVehicles.find((row) => row.packId === source?.sharedFromPackId);
  if (!sharedVehicle) return null;

  return formatScheduleSourceLine(vehicle, sharedVehicle);
};
