export type TimelineEntry = {
  serviceId: string;
  shop: string;
  serviceDate: string;
  mileage: number;
  lineItems: string[];
  total: string;
  evidenceIds: string[];
  source?: "receipt" | "voice" | "owner_note" | "dealer";
};

export type QueueItem = {
  taskId: string;
  title: string;
  reason: string;
  status: string;
  taskKind?: "recommendation" | "verification";
  ruleId?: string;
};

export type ConsoleDensity = "comfortable" | "compact";

export type PipelinePhase = "idle" | "syncing" | "extracting";

export type VehicleContextSnapshot = {
  label: string;
  mileage: number;
  pendingNowCount: number;
  lastServiceDate: string | null;
  lastServiceShop: string | null;
  pipelinePhase: PipelinePhase;
  pipelineLabel: string;
};

export type ScheduleProjectionRow = {
  entryId: string;
  serviceName: string;
  systemGroup: string;
  dueDate: string | null;
  dueMileage: number | null;
  status: "overdue" | "due_soon" | "upcoming" | "needs_baseline";
  serviceBaseline: {
    performedDate: string | null;
    performedMileage: number | null;
    baselineSource: "receipt" | "owned_since" | "unknown";
  };
  oemInterval: { months: number | null; miles: number | null };
  oemSource: { manualTitle: string; page: string | null; ruleId: string };
  dueDateConfidence: "oem_calendar" | "mileage_converted" | "needs_baseline";
  isStubSchedule: boolean;
};

export type MaintenanceScheduleView = {
  near: ScheduleProjectionRow[];
  extended: ScheduleProjectionRow[];
  effectiveMilesPerYear: number;
};
