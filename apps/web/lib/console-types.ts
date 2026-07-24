export type TimelineEntry = {
  serviceId: string;
  shop: string;
  serviceDate: string;
  mileage: number;
  lineItems: string[];
  total: string;
  evidenceIds: string[];
  source?: "receipt" | "voice" | "owner_note" | "dealer" | "carfax_import";
};

export type QueueItem = {
  taskId: string;
  title: string;
  reason: string;
  status: string;
  taskKind?: "recommendation" | "verification";
  ruleId?: string;
  verificationCode?: "VERIFY_ODOMETER" | "VERIFY_DATE";
  dueBy?: string | null;
  snoozeUntil?: string | null;
  snoozeCount?: number;
};

export type OwnerReminderItem = {
  taskId: string;
  title: string;
  reason: string;
  status: string;
  effectiveStatus: "pending" | "snoozed" | "done";
  deadlineLabel: string;
  dueBy: string | null;
  urgency: "overdue" | "due_now" | "due_soon" | "upcoming" | "snoozed";
  snoozeCount: number;
  snoozeUntil: string | null;
  escalation: string | null;
  ruleId?: string;
};

export type ConsoleDensity = "comfortable" | "compact";

export type PipelinePhase = "idle" | "syncing" | "extracting";

export type VehicleContextSnapshot = {
  label: string;
  mileage: number;
  pendingReminderCount: number;
  pendingVerificationCount: number;
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
    baselineSource: "receipt" | "carfax" | "owned_since" | "unknown";
  };
  oemInterval: { months: number | null; miles: number | null };
  oemSource: { manualTitle: string; page: string | null; ruleId: string };
  dueDateConfidence: "oem_calendar" | "mileage_converted" | "needs_baseline";
  isStubSchedule: boolean;
};

export type MaintenanceScheduleView = {
  near: ScheduleProjectionRow[];
  extended: ScheduleProjectionRow[];
  full: ScheduleProjectionRow[];
  effectiveMilesPerYear: number;
  observedMilesPerYear?: number | null;
  statedMilesPerYear?: number | null;
  dueSoonDays?: number;
  horizonEnd?: {
    near: string;
    extended: string;
    full: string;
  };
};

export type VerificationMaturityView = {
  thisWeekCount: number;
  lastWeekCount: number;
  weekOverWeekDelta: number;
  weeklyCounts: { weekStart: string; count: number }[];
  expectedCurve: { weekStart: string; count: number }[];
  maturityStage: "onboarding" | "learning" | "steady";
  hasEnoughRealData: boolean;
  trendMessage: string;
  celebrateTrend: boolean;
};

export type OwnershipRecordEntry = {
  recordId: string;
  agency: string;
  recordDate: string;
  mileage: number | null;
  eventType: "registration" | "title" | "inspection" | "lien" | "other";
  description: string;
  details: string[];
  source: "rmv_import" | "carfax_import";
};

export type ServiceHistoryTab = "history" | "schedule" | "ownership";
