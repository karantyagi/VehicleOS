export type MockScreen =
  | "empty"
  | "add-vehicle"
  | "now"
  | "due-detail"
  | "action-receipt"
  | "recommendation"
  | "timeline"
  | "upload";

export type NotificationKind = "due" | "action" | "recommendation";

export type FeedItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  shortLabel: string;
  badge: string;
  progress?: number;
  urgency: "soon" | "today" | "info";
};

export const mockVehicle = {
  year: 2019,
  make: "Honda",
  model: "Civic",
  label: "2019 Honda Civic",
  mileage: 42100,
  lastService: "Oil change · Jan 12",
};

export const feedItems: FeedItem[] = [
  {
    id: "due-tire",
    kind: "due",
    title: "Tire rotation",
    shortLabel: "Tire rotation",
    badge: "~1 week",
    progress: 88,
    urgency: "soon",
  },
  {
    id: "action-receipt",
    kind: "action",
    title: "Jiffy Lube receipt",
    shortLabel: "Confirm receipt",
    badge: "Photo",
    urgency: "today",
  },
  {
    id: "rec-filter",
    kind: "recommendation",
    title: "Cabin air filter",
    shortLabel: "Cabin filter",
    badge: "2,600 mi",
    progress: 62,
    urgency: "info",
  },
];

export const upcomingItems = [
  { label: "Tire rotation", when: "~1 week", status: "due" as const },
  { label: "Cabin filter", when: "2,600 mi", status: "soon" as const },
  { label: "Oil change", when: "OK", status: "ok" as const },
];

export const timelineEvents = [
  {
    id: "1",
    date: "Jan 12",
    miles: 41_800,
    title: "Oil change",
    shop: "Jiffy Lube",
    status: "confirmed" as const,
  },
  {
    id: "2",
    date: "Aug 3",
    miles: 37_200,
    title: "Tire rotation",
    shop: "Town Fair Tire",
    status: "confirmed" as const,
  },
  {
    id: "3",
    date: "Mar 15",
    miles: 32_400,
    title: "Brake inspection",
    shop: "Honda dealer",
    status: "confirmed" as const,
  },
];

export const receiptDraft = {
  shop: "Jiffy Lube",
  date: "Jan 11, 2026",
  miles: 41_800,
  lines: ["Oil change (synthetic)", "Filter replaced", "Inspection"],
  total: "$67.42",
};

export const recommendationDetail = {
  title: "Cabin air filter",
  dueInMiles: 2600,
  dueInMonths: 4,
  why: "Last logged at 32,400 mi · Honda interval ~15–20k mi",
  rule: "schedule.policy.cabin_filter · v1",
};

export const quoteDraft = {
  dealer: "Honda of Westford",
  items: ["Brake pads + rotors (front)", "Labor 2.5 hr"],
  quoted: "$1,240",
  fairRange: "$890 – $1,050",
  verdict: "Above typical range for your vehicle and mileage",
};

export type WebPanel = "review" | "quote" | "timeline";
