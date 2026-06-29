export type QueueKind = "due" | "action" | "recommendation";

export type AppScreen =
  | "overview"
  | "review"
  | "quote"
  | "timeline"
  | "due"
  | "recommendation"
  | "capture";

export type QueueItem = {
  id: string;
  kind: QueueKind;
  label: string;
  badge: string;
  progress?: number;
};

export const vehicle = {
  label: "2019 Honda Civic",
  mileage: 42100,
  lastService: "Oil change · Jan 12",
};

export const queue: QueueItem[] = [
  { id: "due-tire", kind: "due", label: "Tire rotation", badge: "~1 week", progress: 88 },
  { id: "action-receipt", kind: "action", label: "Confirm receipt", badge: "Photo" },
  { id: "rec-filter", kind: "recommendation", label: "Cabin filter", badge: "2,600 mi", progress: 62 },
];

export const upcoming = [
  { label: "Tire rotation", when: "~1 week", tone: "due" as const },
  { label: "Cabin filter", when: "2,600 mi", tone: "soon" as const },
  { label: "Oil change", when: "OK", tone: "ok" as const },
];

export const timeline = [
  { id: "1", date: "Jan 12, 2026", miles: 41800, title: "Oil change", shop: "Jiffy Lube" },
  { id: "2", date: "Aug 3, 2025", miles: 37200, title: "Tire rotation", shop: "Town Fair Tire" },
  { id: "3", date: "Mar 15, 2025", miles: 32400, title: "Brake inspection", shop: "Honda dealer" },
];

export const receipt = {
  shop: "Jiffy Lube",
  date: "Jan 11, 2026",
  miles: 41800,
  lines: ["Oil change (synthetic)", "Filter replaced", "Inspection"],
  total: "$67.42",
};

export const quote = {
  dealer: "Honda of Westford",
  body: "Brake pads + rotors (front)\nLabor 2.5 hr\nQuoted: $1,240",
  verdict: "Above typical range for your vehicle and mileage",
  range: "$890 – $1,050",
};

export const recommendation = {
  title: "Cabin air filter",
  miles: 2600,
  months: 4,
  why: "Last logged at 32,400 mi. Honda interval ~15–20k mi for your climate.",
  rule: "schedule.policy.cabin_filter · v1",
};

export const STORAGE_KEY = "vos-playground-onboarded";

export function screenForQueue(id: string): AppScreen {
  if (id === "due-tire") return "due";
  if (id === "action-receipt") return "review";
  if (id === "rec-filter") return "recommendation";
  return "overview";
}
