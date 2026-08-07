export const DEFAULT_SERVICE_NOTE_STARTERS = [
  "Oil and filter changed",
  "Tires rotated",
  "Inspection completed",
  "Battery replaced",
] as const;

type ServiceTimelineStarterSource = {
  serviceDate?: string;
  lineItems?: unknown;
};

const normalized = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();

/**
 * Returns exact owner-history labels as optional, deterministic starters. It
 * deliberately does not infer a service or generate new copy.
 */
export function recentServiceNoteStarters(
  timeline: ServiceTimelineStarterSource[],
  limit = 2,
): string[] {
  const defaults = new Set(DEFAULT_SERVICE_NOTE_STARTERS.map(normalized));
  const seen = new Set<string>();

  return [...timeline]
    .sort((left, right) => (right.serviceDate ?? "").localeCompare(left.serviceDate ?? ""))
    .flatMap((entry) => (Array.isArray(entry.lineItems) ? entry.lineItems : []))
    .flatMap((line) => (typeof line === "string" ? [line.trim().replace(/\s+/g, " ")] : []))
    .filter((line) => line.length > 2 && line.length <= 64)
    .filter((line) => {
      const key = normalized(line);
      if (defaults.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}
