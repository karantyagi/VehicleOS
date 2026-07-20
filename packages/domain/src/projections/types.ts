import type { TaskStatus } from "../events/catalog.js";

export type ServiceTimelineEntry = {
  serviceId: string;
  shop: string;
  serviceDate: string;
  mileage: number;
  lineItems: string[];
  total: string;
  evidenceIds: string[];
};

export type NowQueueItem = {
  taskId: string;
  recommendationId: string;
  title: string;
  reason: string;
  status: TaskStatus;
  ruleId?: string;
};

export type VehicleProjectionState = {
  vehicleId: string;
  currentMileage: number;
  timeline: ServiceTimelineEntry[];
  nowQueue: NowQueueItem[];
};

export const createEmptyVehicleState = (vehicleId: string): VehicleProjectionState => ({
  vehicleId,
  currentMileage: 0,
  timeline: [],
  nowQueue: [],
});
