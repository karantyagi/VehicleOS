import type { ServiceTimelineEntry } from "../projections/types.js";

export const serviceNamePattern = (serviceName: string): RegExp => {
  const normalized = serviceName.toLowerCase();
  if (normalized.includes("oil")) {
    return /oil change|oil (&|and|\/)\s*filter|engine oil|replace engine oil|synthetic oil|lube,? oil|oil filter|oil and filter changed/i;
  }
  if (normalized.includes("tire")) {
    return /tire rotation|rotate tires|tires rotated|rotation \(tires\)|tires rotated and balanced/i;
  }
  if (normalized.includes("cabin")) return /cabin filter|cabin air filter/i;
  if (normalized.includes("engine") && normalized.includes("air")) {
    return /engine air filter|air filter replaced|air filter changed/i;
  }
  if (normalized.includes("brake")) {
    if (/rear/.test(normalized)) {
      return /rear brake|brake pads?,\s*rear|rear pads|rear rotors?/i;
    }
    if (/front/.test(normalized)) {
      return /front brake|brake pads?,\s*front|front pads|front rotors?/i;
    }
    return /brake fluid|brake service|brakes? inspected|brake pads? replaced|brake rotors?|fluid - brake|brake inspection/i;
  }
  if (normalized.includes("transmission")) {
    return /transmission fluid|trans fluid|atf|transfer case|differential fluid|rear diff/i;
  }
  if (normalized.includes("coolant")) return /coolant|antifreeze|radiator flush|cooling system/i;
  if (normalized.includes("spark")) return /spark plug/i;
  if (normalized.includes("wiper")) return /wiper blade|wipers replaced/i;
  return new RegExp(normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
};

export const lineMatchesServiceName = (lineItem: string, serviceName: string): boolean =>
  serviceNamePattern(serviceName).test(lineItem);

export const findMatchingServices = (
  timeline: ServiceTimelineEntry[],
  serviceName: string,
): ServiceTimelineEntry[] =>
  timeline.filter((entry) => entry.lineItems.some((line) => lineMatchesServiceName(line, serviceName)));

export const findLastMatchingService = (
  timeline: ServiceTimelineEntry[],
  serviceName: string,
): ServiceTimelineEntry | undefined => {
  const matches = findMatchingServices(timeline, serviceName);
  if (matches.length === 0) return undefined;
  return [...matches].sort((left, right) => left.serviceDate.localeCompare(right.serviceDate)).at(-1);
};
