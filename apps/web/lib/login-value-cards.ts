/** Login spotlight stack — sync with assistant-product-model.md § Login page */
export type LoginValueCard = {
  id: string;
  title: string;
  body: string;
};

export const LOGIN_VALUE_CARDS: LoginValueCard[] = [
  {
    id: "planner",
    title: "Stop being the planner",
    body: "Hand off records once — your assistant owns the schedule.",
  },
  {
    id: "missed",
    title: "Nothing gets missed",
    body: "Reminders with plain-English why, before things go overdue.",
  },
  {
    id: "background",
    title: "Works in the background",
    body: "Light nudges when it matters — no daily app habit.",
  },
  {
    id: "verify",
    title: "Gets smarter over time",
    body: "Early verification, then it gets quieter every week.",
  },
  {
    id: "execute",
    title: "You just show up",
    body: "Book, pay, drive — zero planning overhead.",
  },
];

/** Auto-advance dwell between spotlight rows (ms) */
export const LOGIN_SPOTLIGHT_MS = 2800;
