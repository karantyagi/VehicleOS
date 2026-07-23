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
