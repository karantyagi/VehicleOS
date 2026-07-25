import type { VehicleOsImportService } from "./record-vehicleos-import.js";

/** Small odometer rounding between visits on different days. */
export const CROSS_DAY_MILEAGE_TOLERANCE_MI = 10;

/**
 * Trust CARFAX unless a cross-day rollback is meaningful — not same-day noise.
 * Same-day visits are never compared (CARFAX often lists multiple events with slightly different odometer).
 */
export const shouldFlagCrossDayMileageRegression = (
  mileage: number,
  priorDaysMax: number,
): boolean => {
  if (priorDaysMax <= 0) return false;
  if (mileage >= priorDaysMax - CROSS_DAY_MILEAGE_TOLERANCE_MI) return false;

  const drop = priorDaysMax - mileage;
  const dropRatio = drop / priorDaysMax;

  if (priorDaysMax < 500) {
    return drop >= 50 && dropRatio >= 0.5;
  }

  return drop >= 500 || (drop >= 50 && dropRatio >= 0.01);
};

export const crossDayMileageRegressionByIndex = (
  services: VehicleOsImportService[],
): Map<number, number> => {
  const maxMileageByDate = new Map<string, number>();
  for (const service of services) {
    const date = service.serviceDate.trim();
    maxMileageByDate.set(date, Math.max(maxMileageByDate.get(date) ?? 0, service.mileage));
  }

  const sortedDates = [...maxMileageByDate.keys()].sort();
  const priorDaysMaxByDate = new Map<string, number>();
  let runningMax = 0;
  for (const date of sortedDates) {
    priorDaysMaxByDate.set(date, runningMax);
    runningMax = Math.max(runningMax, maxMileageByDate.get(date) ?? 0);
  }

  const regressions = new Map<number, number>();
  for (const [index, service] of services.entries()) {
    const priorDaysMax = priorDaysMaxByDate.get(service.serviceDate.trim()) ?? 0;
    if (shouldFlagCrossDayMileageRegression(service.mileage, priorDaysMax)) {
      regressions.set(index, priorDaysMax);
    }
  }

  return regressions;
};
