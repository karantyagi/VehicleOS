import type { ServiceTimelineEntry } from "../projections/types.js";

export const serviceNamePattern = (serviceName: string): RegExp => {
  const normalized = serviceName.toLowerCase();
  if (normalized.includes("oil")) {
    return /oil change|oil (&|and|\/)\s*filter|engine oil|replace engine oil|synthetic oil|lube,? oil|oil filter/i;
  }
  if (normalized.includes("tire")) {
    return /tire rotation|rotate tires|tires rotated|rotation \(tires\)/i;
  }
  if (normalized.includes("cabin")) return /cabin filter|cabin air filter/i;
  if (normalized.includes("brake")) {
    return /brake fluid|brake service|brakes|brake inspection|fluid - brake/i;
  }
  if (normalized.includes("transmission")) return /transmission fluid|trans fluid|atf/i;
  if (normalized.includes("coolant")) return /coolant|antifreeze|radiator flush/i;
  return new RegExp(normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
};

export const findLastMatchingService = (
  timeline: ServiceTimelineEntry[],
  serviceName: string,
): ServiceTimelineEntry | undefined =>
  [...timeline].reverse().find((entry) => entry.lineItems.some((line) => serviceNamePattern(serviceName).test(line)));
