import type {
  IntervalBasis,
  IntervalOverlayMemory,
  MaintenancePatternMemory,
  OwnerContextMemory,
  ServiceBenefitMemory,
  TireRotationConditionId,
} from "./types.js";

const INTERVAL_BASES = new Set<IntervalBasis>(["mileage", "time", "mixed"]);
const TIRE_ROTATION_CONDITIONS = new Set<TireRotationConditionId>([
  "uneven_tread",
  "pressure_or_tpms",
  "pull_vibration_or_cupping",
  "special_tire_setup",
]);

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeStringList = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
};

const normalizeMaintenancePatterns = (
  value: unknown,
): Record<string, MaintenancePatternMemory> | undefined => {
  if (!value || typeof value !== "object") return undefined;

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([entryId, patternValue]) => {
      if (!entryId.trim() || !patternValue || typeof patternValue !== "object") return null;
      const pattern = patternValue as Record<string, unknown>;
      const timing = pattern.timing;
      const reason = normalizeString(pattern.reason);
      const confirmedAt = normalizeString(pattern.confirmedAt);
      if ((timing !== "early" && timing !== "late") || !reason || !confirmedAt) return null;
      return [entryId.trim(), { timing, reason, confirmedAt }] as const;
    })
    .filter((entry): entry is readonly [string, MaintenancePatternMemory] => entry !== null);

  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
};

const normalizeIntervalOverlays = (
  value: unknown,
): Record<string, IntervalOverlayMemory> | undefined => {
  if (!value || typeof value !== "object") return undefined;

  const normalized: Record<string, IntervalOverlayMemory> = {};

  for (const [entryId, overlayValue] of Object.entries(value as Record<string, unknown>)) {
    if (!entryId.trim() || !overlayValue || typeof overlayValue !== "object") continue;
    const overlay = overlayValue as Record<string, unknown>;
    const label = normalizeString(overlay.label);
    const confirmedAt = normalizeString(overlay.confirmedAt);
    if (!label || !confirmedAt) continue;
    const intervalMonths =
      typeof overlay.intervalMonths === "number" ? overlay.intervalMonths : undefined;
    const intervalMiles =
      typeof overlay.intervalMiles === "number" ? overlay.intervalMiles : undefined;
    if (intervalMonths === undefined && intervalMiles === undefined) continue;
    const basis =
      typeof overlay.basis === "string" && INTERVAL_BASES.has(overlay.basis as IntervalBasis)
        ? (overlay.basis as IntervalBasis)
        : undefined;
    const tireRotationConditions = Array.isArray(overlay.tireRotationConditions)
      ? overlay.tireRotationConditions.filter(
          (condition): condition is TireRotationConditionId =>
            typeof condition === "string" &&
            TIRE_ROTATION_CONDITIONS.has(condition as TireRotationConditionId),
        )
      : undefined;
    normalized[entryId.trim()] = {
      intervalMonths: intervalMonths ?? null,
      intervalMiles: intervalMiles ?? null,
      basis,
      tireRotationConditions:
        tireRotationConditions && tireRotationConditions.length > 0
          ? [...new Set(tireRotationConditions)]
          : undefined,
      label,
      confirmedAt,
    };
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const normalizeShopLocations = (value: unknown): Record<string, string> | undefined => {
  if (!value || typeof value !== "object") return undefined;

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([shop, location]) => {
      const normalizedLocation = normalizeString(location);
      if (!normalizedLocation) return null;
      return [shop.trim().toLowerCase().replace(/\s+/g, " "), normalizedLocation] as const;
    })
    .filter((entry): entry is readonly [string, string] => entry !== null);

  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
};

const normalizeServiceBenefits = (
  value: unknown,
): Record<string, ServiceBenefitMemory> | undefined => {
  if (!value || typeof value !== "object") return undefined;

  const normalized: Record<string, ServiceBenefitMemory> = {};
  for (const [serviceId, benefitValue] of Object.entries(value as Record<string, unknown>)) {
    if (!serviceId.trim() || !benefitValue || typeof benefitValue !== "object") continue;
    const benefit = benefitValue as Record<string, unknown>;
    const providerName = normalizeString(benefit.providerName);
    const providerLocation = normalizeString(benefit.providerLocation);
    const benefitLabel = normalizeString(benefit.benefitLabel);
    const confirmedAt = normalizeString(benefit.confirmedAt);
    const expectedCost =
      typeof benefit.expectedCost === "number" && Number.isFinite(benefit.expectedCost)
        ? benefit.expectedCost
        : undefined;
    if (!providerName || !benefitLabel || !confirmedAt) continue;
    normalized[serviceId.trim()] = {
      providerName,
      ...(providerLocation ? { providerLocation } : {}),
      benefitLabel,
      expectedCost: expectedCost ?? null,
      currency: "USD",
      confirmedAt,
    };
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

export const normalizeOwnerContextMemory = (value: unknown): OwnerContextMemory => {
  if (!value || typeof value !== "object") return {};

  const record = value as Record<string, unknown>;

  return {
    primaryCity: normalizeString(record.primaryCity),
    primaryCityUpdatedAt: normalizeString(record.primaryCityUpdatedAt),
    climateNotes: normalizeStringList(record.climateNotes),
    lastTireProduct: normalizeString(record.lastTireProduct),
    ownerStatedPriorities: normalizeStringList(record.ownerStatedPriorities),
    shopLocations: normalizeShopLocations(record.shopLocations),
    maintenancePatterns: normalizeMaintenancePatterns(record.maintenancePatterns),
    intervalOverlays: normalizeIntervalOverlays(record.intervalOverlays),
    serviceBenefits: normalizeServiceBenefits(record.serviceBenefits),
  };
};

export const hasOwnerContextMemory = (value: OwnerContextMemory | null | undefined): boolean => {
  if (!value) return false;
  return Boolean(
    value.primaryCity ||
      (value.climateNotes?.length ?? 0) > 0 ||
      value.lastTireProduct ||
      (value.ownerStatedPriorities?.length ?? 0) > 0 ||
      Object.keys(value.shopLocations ?? {}).length > 0 ||
      Object.keys(value.maintenancePatterns ?? {}).length > 0 ||
      Object.keys(value.intervalOverlays ?? {}).length > 0 ||
      Object.keys(value.serviceBenefits ?? {}).length > 0,
  );
};
