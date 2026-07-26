export type ScheduleSourceVehicle = {
  year: number;
  make: string;
  model: string;
  trim: string;
  powertrain?: string | null;
};

export const formatScheduleSourceVehicleLabel = (vehicle: ScheduleSourceVehicle): string => {
  const trim = vehicle.trim.trim();
  const powertrain = vehicle.powertrain?.trim() ?? "";
  const powertrainSuffix =
    powertrain && powertrain.toLowerCase() !== trim.toLowerCase() ? ` ${powertrain}` : "";
  return `${vehicle.year} ${vehicle.make} ${vehicle.model} ${trim}${powertrainSuffix}`;
};

/** Owner-facing one-liner when factory used a shared or adjacent-year OEM manual. */
export const formatScheduleSourceLine = (
  vehicle: ScheduleSourceVehicle,
  sharedVehicle: ScheduleSourceVehicle | null | undefined,
): string | null => {
  if (!sharedVehicle) return null;

  const sameVehicle =
    sharedVehicle.year === vehicle.year &&
    sharedVehicle.make === vehicle.make &&
    sharedVehicle.model === vehicle.model &&
    sharedVehicle.trim === vehicle.trim &&
    (sharedVehicle.powertrain ?? "") === (vehicle.powertrain ?? "");

  if (sameVehicle) return null;

  const manualLabel = formatScheduleSourceVehicleLabel(sharedVehicle);

  if (sharedVehicle.year !== vehicle.year) {
    return `Schedule from the ${manualLabel} manual — closest verified OEM year for your ${vehicle.year} ${vehicle.model}.`;
  }

  return `Schedule from the ${manualLabel} manual — same OEM intervals for your car.`;
};

export type ScheduleSourceRegistryRow = {
  manualShareApplied?: boolean;
  sharedFromPackId?: string;
};

export const shouldDiscloseScheduleSource = (
  source: ScheduleSourceRegistryRow | null | undefined,
): boolean => Boolean(source?.manualShareApplied && source.sharedFromPackId);
