import { getServiceAliasRegistry } from "../adapters/service-alias-registry.js";
import type { CatalogDomainEvent, VehicleProjectionState } from "@vehicleos/domain";
import {
  buildOwnerReminderViews,
  buildOwnerServiceScheduleBoard,
  computeVerificationMaturity,
  enrichTimelineForDisplay,
  projectMaintenanceDeviations,
  projectMaintenanceSchedule,
  projectOwnershipRenewals,
  resolveScheduleProjectionContext,
  splitOwnerQueues,
} from "@vehicleos/domain";
import type { VehicleRecord } from "../repositories/vehicle-repository.js";

export type VehicleProfileInput = Pick<
  VehicleRecord,
  "ownedSince" | "drivingStyle" | "statedMilesPerYear" | "createdAt" | "ownerContextMemory"
>;

export const buildVehicleStateView = (
  state: VehicleProjectionState,
  profile?: VehicleProfileInput,
  events?: CatalogDomainEvent[],
) => {
  const scheduleContext = resolveScheduleProjectionContext({
    ownedSince: profile?.ownedSince ?? null,
    drivingStyle: profile?.drivingStyle ?? null,
    statedMilesPerYear: profile?.statedMilesPerYear ?? null,
    timeline: state.timeline,
  });

  const serviceAliasRegistry = getServiceAliasRegistry();

  const scheduleProjectionBase = {
    knowledgeSchedule: state.knowledgeSchedule,
    timeline: state.timeline,
    currentMileage: state.currentMileage,
    effectiveMilesPerYear: scheduleContext.effectiveMilesPerYear,
    ownedSince: scheduleContext.ownedSince,
    dueSoonDays: scheduleContext.dueSoonDays,
    ownerContextMemory: profile?.ownerContextMemory,
    serviceAliasRegistry,
  };

  const scheduleNear = projectMaintenanceSchedule({
    ...scheduleProjectionBase,
    horizonMode: "near",
  });

  const scheduleExtended = projectMaintenanceSchedule({
    ...scheduleProjectionBase,
    horizonMode: "extended",
  });

  const scheduleFull = projectMaintenanceSchedule({
    ...scheduleProjectionBase,
    horizonMode: "full",
  });

  const today = new Date().toISOString().slice(0, 10);

  const serviceScheduleBoard = buildOwnerServiceScheduleBoard({
    ...scheduleProjectionBase,
    today,
  });
  const scheduleRowsForReminders = [...scheduleNear.rows, ...scheduleExtended.rows];
  const reminders = buildOwnerReminderViews({
    items: state.nowQueue,
    scheduleRows: scheduleRowsForReminders,
    today,
  });
  const { verifications } = splitOwnerQueues(state.nowQueue);
  const pendingVerificationCount = verifications.filter((item) => item.status === "pending").length;

  return {
    timeline: enrichTimelineForDisplay(state.timeline, state.evidenceVault),
    nowQueue: state.nowQueue,
    reminders,
    verifications,
    pendingReminderCount: reminders.length,
    pendingVerificationCount,
    quoteAnalyses: state.quoteAnalyses,
    evidenceVault: state.evidenceVault,
    knowledgeSchedule: state.knowledgeSchedule,
    currentMileage: state.currentMileage,
    verificationMaturity: events
      ? computeVerificationMaturity({ vehicleId: state.vehicleId, events })
      : null,
    maintenanceSchedule: {
      near: scheduleNear.rows,
      extended: scheduleExtended.rows,
      full: scheduleFull.rows,
      effectiveMilesPerYear: scheduleContext.effectiveMilesPerYear,
      observedMilesPerYear: scheduleContext.observedMilesPerYear,
      statedMilesPerYear: scheduleContext.statedMilesPerYear,
      dueSoonDays: scheduleContext.dueSoonDays,
      horizonEnd: {
        near: scheduleNear.horizonEnd,
        extended: scheduleExtended.horizonEnd,
        full: scheduleFull.horizonEnd,
      },
    },
    serviceScheduleBoard,
    ownershipRenewals: projectOwnershipRenewals({
      ownershipRecords: state.ownershipRecords,
      today,
    }),
    maintenanceDeviations: projectMaintenanceDeviations({
      scheduleRows: scheduleExtended.rows,
      ownerContextMemory: profile?.ownerContextMemory,
    }),
    ownershipRecords: state.ownershipRecords,
  };
};
