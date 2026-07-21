import type { NowQueueItem } from "../projections/types.js";

export type NowQueueCategory = "verification" | "seasonal" | "oem" | "schedule" | "other";

export const classifyNowQueueItem = (item: NowQueueItem): NowQueueCategory => {
  if (item.taskKind === "verification") return "verification";
  if (item.ruleId?.startsWith("seasonal.policy.")) return "seasonal";
  if (item.ruleId?.startsWith("knowledge.policy.")) return "oem";
  if (item.ruleId?.startsWith("schedule.policy.")) return "schedule";
  return "other";
};

export const nowQueueCategoryLabel = (category: NowQueueCategory): string => {
  if (category === "verification") return "Verify";
  if (category === "seasonal") return "Seasonal";
  if (category === "oem") return "OEM schedule";
  if (category === "schedule") return "Maintenance";
  return "Action";
};

export const splitNowQueue = (items: NowQueueItem[]): {
  pending: NowQueueItem[];
  recent: NowQueueItem[];
} => {
  const pending = items.filter((item) => item.status === "pending");
  const recent = items.filter((item) => item.status !== "pending");
  return { pending, recent };
};
