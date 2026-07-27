/** Login spotlight stack — sync with assistant-product-model.md § Login page · oem-first-product-shape.md */
export type LoginValueCard = {
  id: string;
  title: string;
  body: string;
};

export const LOGIN_VALUE_CARDS: LoginValueCard[] = [
  {
    id: "pain",
    title: "Stop scheduling maintenance manually",
    body: "Intervals and receipts — off your plate.",
  },
  {
    id: "schedule",
    title: "Official maintenance schedule built in",
    body: "Verified OEM intervals load when you pick your car — no PDF hunt.",
  },
  {
    id: "reminders",
    title: "Reminded before it's overdue",
    body: "Oil, tires, inspection — with a plain-English why.",
  },
  {
    id: "execute",
    title: "You execute, it remembers",
    body: "You book and show up — it updates from your next receipt.",
  },
  {
    id: "alerts",
    title: "Alerts, not another dashboard",
    body: "Light nudges when it matters — peek only when you want.",
  },
  {
    id: "handoff",
    title: "Hand off history when you want",
    body: "CARFAX or RMV — optional; makes the assistant smarter for you.",
  },
];

/** Auto-advance dwell between spotlight rows (ms) */
export const LOGIN_SPOTLIGHT_MS = 2200;
