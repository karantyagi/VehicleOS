export type DrivingStyle = "economical" | "casual" | "aggressive";

export type DriverHabitsDraft = {
  drivingStyle: DrivingStyle;
  statedMilesPerYear: number | null;
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
    label: "Aggressive",
    description: "Hard accel/brake/cornering — more preemptive wear-item nudges.",
  },
];

const storageKey = (vehicleId: string) => `vehicleos:driver-habits:${vehicleId}`;

export const loadDriverHabits = (vehicleId: string | null): DriverHabitsDraft => {
  if (!vehicleId || typeof window === "undefined") {
    return { drivingStyle: "casual", statedMilesPerYear: null };
  }
  try {
    const raw = localStorage.getItem(storageKey(vehicleId));
    if (!raw) return { drivingStyle: "casual", statedMilesPerYear: null };
    const parsed = JSON.parse(raw) as DriverHabitsDraft;
    if (
      parsed.drivingStyle === "economical" ||
      parsed.drivingStyle === "casual" ||
      parsed.drivingStyle === "aggressive"
    ) {
      return {
        drivingStyle: parsed.drivingStyle,
        statedMilesPerYear:
          typeof parsed.statedMilesPerYear === "number" ? parsed.statedMilesPerYear : null,
      };
    }
  } catch {
    // ignore corrupt local draft
  }
  return { drivingStyle: "casual", statedMilesPerYear: null };
};

export const saveDriverHabits = (vehicleId: string, draft: DriverHabitsDraft): void => {
  localStorage.setItem(storageKey(vehicleId), JSON.stringify(draft));
};

export const hasDriverHabits = (vehicleId: string | null): boolean => {
  if (!vehicleId || typeof window === "undefined") return false;
  return localStorage.getItem(storageKey(vehicleId)) !== null;
};

export const parseStatedMilesPerYear = (milesInput: string): number | null | "invalid" => {
  if (!milesInput.trim()) return null;
  const parsed = Number(milesInput);
  if (parsed < 1_000 || parsed > 80_000) return "invalid";
  return parsed;
};
