import type { VehicleProjectionState } from "@vehicleos/domain";
import { enrichTimelineForDisplay } from "@vehicleos/domain";

export const buildVehicleStateView = (state: VehicleProjectionState) => ({
  timeline: enrichTimelineForDisplay(state.timeline, state.evidenceVault),
  nowQueue: state.nowQueue,
  quoteAnalyses: state.quoteAnalyses,
  evidenceVault: state.evidenceVault,
  knowledgeSchedule: state.knowledgeSchedule,
  currentMileage: state.currentMileage,
});
