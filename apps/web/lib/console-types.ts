export type TimelineEntry = {
  serviceId: string;
  shop: string;
  shopLocation?: string;
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
  verificationCode?:
    | "VERIFY_ODOMETER"
    | "VERIFY_DATE"
    | "VERIFY_VEHICLE_PROFILE"
    | "VERIFY_IMPORT_ROW"
    | "VERIFY_MAINTENANCE_TIMING"
    | "VERIFY_OWNER_INTERVAL";
  dueBy?: string | null;
  snoozeUntil?: string | null;
  snoozeCount?: number;
  suggestedReasonId?: "winter_salt" | "noise_symptom" | "dealer_recommended" | "aggressive_driving" | "deferred_intentionally" | "other";
  draftReasonSource?: "heuristic" | "llm";
  suggestedIntervalMiles?: number;
  suggestedIntervalMonths?: number;
  intervalKind?: "general" | "tire_rotation";
};

export type OwnerReminderItem = {
  taskId: string;
  title: string;
  reason: string;
  status: string;
  effectiveStatus: "pending" | "done";
  deadlineLabel: string;
  dueBy: string | null;
  urgency: "overdue" | "due_now" | "due_soon" | "upcoming";
  attentionWindow: "overdue" | "this_week" | "next_week" | "this_month" | "later";
  ruleId?: string;
  intelligence?: import("@vehicleos/domain").MaintenanceItemIntelligence;
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
  oemTiming?: "early" | "on_time" | "late" | "unknown" | null;
  overdueWithoutHistory?: boolean;
  usesOwnerOverlay?: boolean;
  overlayLabel?: string | null;
};

export type MaintenanceDeviationRecord = {
  entryId: string;
  serviceName: string;
  oemTiming: "early" | "late";
  performedDate: string | null;
  dueDate: string | null;
  baselineSource: ScheduleProjectionRow["serviceBaseline"]["baselineSource"];
  hasConfirmedPattern: boolean;
  confirmedPattern?: {
    timing: "early" | "late";
    reason: string;
    confirmedAt: string;
  };
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

export type { OwnerServiceScheduleBoard, OwnerDueItemsView, OwnerHistoryItem } from "@vehicleos/domain";

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
  source: "rmv_import" | "carfax_import" | "owner_note";
};

export type OwnershipRenewalProjection = {
  recordId: string;
  eventType: OwnershipRecordEntry["eventType"];
  title: string;
  expirationDate: string;
  status: "overdue" | "due_soon";
  agency: string;
  description: string;
};

export type ServiceHistoryTab = "history" | "schedule";
