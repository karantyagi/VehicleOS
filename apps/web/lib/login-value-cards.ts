/** Login spotlight stack - sync with assistant-product-model.md and oem-first-product-shape.md. */
export type LoginValueCard = {
  id: string;
  title: string;
  body: string;
};

/** OEM-first arc: less planning, clearer schedule, useful attention, quiet background, remembered history. */
export const LOGIN_VALUE_CARDS: LoginValueCard[] = [
  {
    id: "pain",
    title: "Stop carrying the plan",
    body: "Intervals, receipts, and service dates - all in one clear place.",
  },
  {
    id: "schedule",
    title: "Factory schedule, ready",
    body: "Choose your car. Its maintenance rhythm comes with it.",
  },
  {
    id: "reminders",
    title: "Know what matters next",
    body: "A clear next step, with a plain-English reason when timing matters.",
  },
  {
    id: "quiet",
    title: "Quiet when nothing matters",
    body: "No daily logbook. No needless noise.",
  },
  {
    id: "execute",
    title: "You do the service. It remembers.",
    body: "Keep the useful details close when you need them later.",
  },
];

/** Auto-advance dwell between spotlight rows (ms). */
export const LOGIN_SPOTLIGHT_MS = 2200;
