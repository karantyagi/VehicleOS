export type GarageTier = "free" | "team" | "premium";

export type GarageEntitlements = {
  tier: GarageTier;
  vehicleCount: number;
  vehicleLimit: number | null;
  canAddVehicle: boolean;
  upgradeRequired: boolean;
  upgradeMessage: string | null;
};

export type GarageVehicleSummary = {
  id: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  currentMileage: number;
  vin?: string;
  ownedSince?: string | null;
  drivingStyle?: "economical" | "casual" | "aggressive" | null;
  statedMilesPerYear?: number | null;
  ownerContextMemory?: {
    shopLocations?: Record<string, string>;
  };
};

export type ListVehiclesResponse = {
  vehicles: GarageVehicleSummary[];
  garage: GarageEntitlements;
};

export const formatGarageVehicleLabel = (vehicle: Pick<GarageVehicleSummary, "year" | "make" | "model" | "trim">): string => {
  const trim = vehicle.trim?.trim();
  return trim ? `${vehicle.year} ${vehicle.make} ${vehicle.model} ${trim}` : `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
};

export const isGarageSwitchLocked = (input: {
  isBusy: boolean;
  isRefreshingNow: boolean;
  pipelinePhase: "idle" | "extracting" | "syncing";
  importBusy: boolean;
}): { locked: boolean; reason: string | null } => {
  if (input.importBusy) {
    return { locked: true, reason: "Import in progress — finish or cancel before switching vehicles." };
  }
  if (input.pipelinePhase === "extracting") {
    return { locked: true, reason: "Manual extraction running — wait until it finishes." };
  }
  if (input.pipelinePhase === "syncing" || input.isBusy || input.isRefreshingNow) {
    return { locked: true, reason: "Assistant is syncing this vehicle — try again in a moment." };
  }
  return { locked: false, reason: null };
};
