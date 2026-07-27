import { VERIFIED_PACK_MIN_ENTRIES } from "@vehicleos/domain";
import { loadOemSchedulePack } from "./load-catalog.js";

export type ScheduleDepth = "verified" | "preview";

export const resolveScheduleDepthForPack = (packId: string): ScheduleDepth => {
  try {
    const pack = loadOemSchedulePack(packId);
    return pack.entries.length >= VERIFIED_PACK_MIN_ENTRIES ? "verified" : "preview";
  } catch {
    return "preview";
  }
};
