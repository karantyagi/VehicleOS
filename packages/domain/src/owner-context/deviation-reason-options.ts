export const MAINTENANCE_DEVIATION_REASONS = [
  { id: "winter_salt", label: "Winter road salt / corrosion" },
  { id: "noise_symptom", label: "Noise or symptom appeared" },
  { id: "dealer_recommended", label: "Shop or dealer recommended early" },
  { id: "aggressive_driving", label: "Aggressive or sporty driving" },
  { id: "deferred_intentionally", label: "Deferred intentionally last time" },
  { id: "other", label: "Other — I'll explain later" },
] as const;

export type MaintenanceDeviationReasonId = (typeof MAINTENANCE_DEVIATION_REASONS)[number]["id"];

export const maintenanceDeviationReasonLabel = (
  reasonId: MaintenanceDeviationReasonId,
): string =>
  MAINTENANCE_DEVIATION_REASONS.find((option) => option.id === reasonId)?.label ?? reasonId;
