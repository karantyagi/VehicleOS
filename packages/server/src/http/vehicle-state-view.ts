import type { VehicleProjectionState } from "@vehicleos/domain";
import { enrichTimelineForDisplay, projectMaintenanceSchedule } from "@vehicleos/domain";

export const buildVehicleStateView = (state: VehicleProjectionState) => {
  const scheduleNear = projectMaintenanceSchedule({
    knowledgeSchedule: state.knowledgeSchedule,
    timeline: state.timeline,
    currentMileage: state.currentMileage,
  });

  const scheduleExtended = projectMaintenanceSchedule({
    knowledgeSchedule: state.knowledgeSchedule,
    timeline: state.timeline,
    currentMileage: state.currentMileage,
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
      effectiveMilesPerYear: scheduleNear.effectiveMilesPerYear,
    },
  };
};
