import { enrichKnowledgeScheduleCanonicalIds, type KnowledgeScheduleEntry } from "@vehicleos/domain";
import { loadOemSchedulePack, resolvePackIdForVehicle } from "@vehicleos/knowledge";

export type VehiclePackProfile = {
  year: number;
  make: string;
  model: string;
  trim?: string | null;
};

export const enrichKnowledgeScheduleForVehicle = (
  schedule: KnowledgeScheduleEntry[],
  profile?: VehiclePackProfile | null,
): KnowledgeScheduleEntry[] => {
  if (!profile || schedule.length === 0) return schedule;

  const packId = resolvePackIdForVehicle({
    year: profile.year,
    make: profile.make,
    model: profile.model,
    trim: profile.trim ?? "",
  });

  if (!packId) return schedule;

  try {
    const pack = loadOemSchedulePack(packId);
    const canonicalIdsByEntryId = Object.fromEntries(
      pack.entries.map((entry) => [entry.entryId, entry.canonicalServiceId]),
    ) as Record<string, string | undefined>;

    return enrichKnowledgeScheduleCanonicalIds(schedule, canonicalIdsByEntryId);
  } catch {
    return schedule;
  }
};
