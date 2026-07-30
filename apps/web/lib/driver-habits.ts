export type DrivingStyle = "economical" | "casual" | "aggressive";

export type DriverHabitsDraft = {
  drivingStyle: DrivingStyle;
  statedMilesPerYear: number | null;
  primaryCity: string;
};

import type { OwnerContextMemory } from "@/lib/owner-context";
import { todayIsoDate } from "@/lib/date-input";

export type VehicleOwnerProfile = {
  id: string;
  ownedSince?: string | null;
  drivingStyle?: DrivingStyle | null;
  statedMilesPerYear?: number | null;
  ownerContextMemory?: OwnerContextMemory | null;
};

export const DEFAULT_MILES_PER_YEAR = 10_000;
export const MIN_STATED_MILES_PER_YEAR = 1_000;
export const MAX_STATED_MILES_PER_YEAR = 50_000;

export const STATED_MILES_RANGE_LABEL = "1,000–50,000";

export const STATED_MILES_REQUIRED_MESSAGE = `Enter annual miles driven (${STATED_MILES_RANGE_LABEL}).`;

export const STATED_MILES_INVALID_MESSAGE = `Annual miles driven: ${STATED_MILES_RANGE_LABEL}.`;

export const STATED_MILES_ONBOARDING_HINT =
  "Helps estimate when mileage-based services need attention.";

export const DRIVING_STYLE_OPTIONS: {
  id: DrivingStyle;
  label: string;
  description: string;
}[] = [
  {
    id: "economical",
    label: "Economical",
    description: "Maximize MPG — efficiency tips; OEM safety intervals unchanged.",
  },
  {
    id: "casual",
    label: "Casual",
    description: "Normal mixed driving — standard maintenance pacing.",
  },
  {
    id: "aggressive",
    label: "Sporty",
    description: "Hard acceleration and braking — earlier attention windows for brakes, tires, and fluids.",
  },
];

export const drivingStyleLabel = (style: DrivingStyle | null | undefined): string => {
  const match = DRIVING_STYLE_OPTIONS.find((option) => option.id === style);
  return match?.label ?? "Casual";
};

export const parseStatedMilesPerYear = (milesInput: string): number | null | "invalid" => {
  if (!milesInput.trim()) return null;
  const parsed = Number(milesInput);
  if (parsed < MIN_STATED_MILES_PER_YEAR || parsed > MAX_STATED_MILES_PER_YEAR) return "invalid";
  return parsed;
};

export const patchVehicleProfile = async (
  vehicleId: string,
  patch: Partial<
    Pick<VehicleOwnerProfile, "ownedSince" | "drivingStyle" | "statedMilesPerYear" | "ownerContextMemory">
  >,
): Promise<VehicleOwnerProfile> => {
  const response = await fetch(`/api/vehicles/${vehicleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const body = (await response.json()) as { vehicle?: VehicleOwnerProfile; error?: string };
  if (!response.ok || !body.vehicle) throw new Error(body.error ?? "Update failed");
  return body.vehicle;
};

export const vehicleProfileFromRecord = (
  vehicle: VehicleOwnerProfile | null | undefined,
): DriverHabitsDraft => ({
  drivingStyle: vehicle?.drivingStyle ?? "casual",
  statedMilesPerYear:
    typeof vehicle?.statedMilesPerYear === "number" ? vehicle.statedMilesPerYear : null,
  primaryCity: vehicle?.ownerContextMemory?.primaryCity ?? "",
});

export const buildOwnerContextWithPrimaryCity = (
  existing: OwnerContextMemory | null | undefined,
  primaryCity: string,
): OwnerContextMemory => ({
  ...(existing ?? {}),
  primaryCity: primaryCity.trim(),
  primaryCityUpdatedAt: todayIsoDate(),
});
