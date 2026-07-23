import type { ServiceTimelineEntry } from "../projections/types.js";

export const serviceNamePattern = (serviceName: string): RegExp => {
  const normalized = serviceName.toLowerCase();
  if (normalized.includes("oil")) return /oil change|oil & filter|engine oil|synthetic oil/i;
  if (normalized.includes("tire")) return /tire rotation|rotate tires/i;
  if (normalized.includes("cabin")) return /cabin filter|cabin air filter/i;
  if (normalized.includes("brake")) return /brake fluid|brake service|brakes/i;
  return new RegExp(normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
};

export const findLastMatchingService = (
  timeline: ServiceTimelineEntry[],
  serviceName: string,
): ServiceTimelineEntry | undefined =>
  [...timeline].reverse().find((entry) => entry.lineItems.some((line) => serviceNamePattern(serviceName).test(line)));
