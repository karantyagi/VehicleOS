/** Five login-panel value pillars — keep in sync with assistant-product-model.md § Login page — five value cards */
export type LoginValueCard = {
  id: string;
  title: string;
  body: string;
};

export const LOGIN_VALUE_CARDS: LoginValueCard[] = [
  {
    id: "planner",
    title: "Stop being the planner",
    body: "Maintenance shouldn't live in your head or scattered folders. Hand off records once — your assistant owns the schedule.",
  },
  {
    id: "missed",
    title: "Nothing gets missed",
    body: "Timely reminders with plain-English why — oil, brakes, renewals — before they're overdue or costly.",
  },
  {
    id: "background",
    title: "Quietly in the background",
    body: "Light-touch nudges when it matters. No daily app habit — the assistant works while you live your life.",
  },
  {
    id: "verify",
    title: "Verify once, rarely again",
    body: "Early setup may ask you to clear a few data conflicts. That's the assistant learning your car — it gets quieter every week.",
  },
  {
    id: "execute",
    title: "You just show up",
    body: "Book, pay, drive. Zero planning overhead. The assistant remembers so you don't have to.",
  },
];
