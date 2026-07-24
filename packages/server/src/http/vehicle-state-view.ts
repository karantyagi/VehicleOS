import type { VehicleProjectionState } from "@vehicleos/domain";
import {
  enrichTimelineForDisplay,
  projectMaintenanceSchedule,
  resolveScheduleProjectionContext,
} from "@vehicleos/domain";
import type { VehicleRecord } from "../repositories/vehicle-repository.js";

export type VehicleProfileInput = Pick<
  VehicleRecord,
  "ownedSince" | "drivingStyle" | "statedMilesPerYear"
>;

export const buildVehicleStateView = (
  state: VehicleProjectionState,
  profile?: VehicleProfileInput,
) => {
  const scheduleContext = resolveScheduleProjectionContext({
    ownedSince: profile?.ownedSince ?? null,
    drivingStyle: profile?.drivingStyle ?? null,
    statedMilesPerYear: profile?.statedMilesPerYear ?? null,
    timeline: state.timeline,
  });

  const scheduleNear = projectMaintenanceSchedule({
    knowledgeSchedule: state.knowledgeSchedule,
    timeline: state.timeline,
    currentMileage: state.currentMileage,
    effectiveMilesPerYear: scheduleContext.effectiveMilesPerYear,
    ownedSince: scheduleContext.ownedSince,
    dueSoonDays: scheduleContext.dueSoonDays,
  });

  const scheduleExtended = projectMaintenanceSchedule({
    knowledgeSchedule: state.knowledgeSchedule,
    timeline: state.timeline,
    currentMileage: state.currentMileage,
    effectiveMilesPerYear: scheduleContext.effectiveMilesPerYear,
    ownedSince: scheduleContext.ownedSince,
    dueSoonDays: scheduleContext.dueSoonDays,
    horizonMonths: 12,
  });

  return {
    timeline: enrichTimelineForDisplay(state.timeline, state.evidenceVault),
    nowQueue: state.nowQueue,
    quoteAnalyses: state.quoteAnalyses,
    evidenceVault: state.evidenceVault,
    knowledgeSchedule: state.knowledgeSchedule,
    currentMileage: state.currentMileage,
    maintenanceSchedule: {
      near: scheduleNear.rows,
      extended: scheduleExtended.rows,
      effectiveMilesPerYear: scheduleContext.effectiveMilesPerYear,
      observedMilesPerYear: scheduleContext.observedMilesPerYear,
      statedMilesPerYear: scheduleContext.statedMilesPerYear,
      dueSoonDays: scheduleContext.dueSoonDays,
    },
  };
};
