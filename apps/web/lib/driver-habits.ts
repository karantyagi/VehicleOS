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
    description: "Hard acceleration and braking — earlier reminders on brakes, tires, and fluids.",
  },
];

export const drivingStyleLabel = (style: DrivingStyle | null | undefined): string => {
  const match = DRIVING_STYLE_OPTIONS.find((option) => option.id === style);
  return match?.label ?? "Casual";
};

export const parseStatedMilesPerYear = (milesInput: string): number | null | "invalid" => {
  if (!milesInput.trim()) return null;
  const parsed = Number(milesInput);
  if (parsed < 1_000 || parsed > 80_000) return "invalid";
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
