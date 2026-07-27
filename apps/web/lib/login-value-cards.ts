/** Login spotlight stack — sync with assistant-product-model.md § Login page · oem-first-product-shape.md */
export type LoginValueCard = {
  id: string;
  title: string;
  body: string;
};

/** OEM-first arc: pain → schedule wedge → reminders → quiet background → you execute */
export const LOGIN_VALUE_CARDS: LoginValueCard[] = [
  {
    id: "pain",
    title: "Stop being the planner",
    body: "Intervals, receipts, and “when was that?” — off your plate.",
  },
  {
    id: "schedule",
    title: "Verified OEM schedule built in",
    body: "Pick your car — factory intervals load, no manual upload.",
  },
  {
    id: "reminders",
    title: "Nudged before it's late",
    body: "Oil, tires, inspection — calendar reminders with a plain-English why.",
  },
  {
    id: "quiet",
    title: "Quiet unless you need it",
    body: "No daily logbook. Snooze when life gets busy.",
  },
  {
    id: "execute",
    title: "You execute, it remembers",
    body: "You book and show up — add CARFAX anytime to sharpen dates.",
  },
];

/** Auto-advance dwell between spotlight rows (ms) */
export const LOGIN_SPOTLIGHT_MS = 2200;
