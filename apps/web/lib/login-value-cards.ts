/** Login carousel hooks — sync with assistant-product-model.md § Login page */
export type LoginValueCard = {
  id: string;
  title: string;
  tagline: string;
};

export const LOGIN_VALUE_CARDS: LoginValueCard[] = [
  { id: "planner", title: "Stop being the planner", tagline: "Hand off once. It remembers." },
  { id: "missed", title: "Nothing gets missed", tagline: "Reminded before it's overdue." },
  { id: "background", title: "Works in the background", tagline: "Light nudges. Quiet weeks." },
  { id: "verify", title: "Gets smarter over time", tagline: "Fewer questions each week." },
  { id: "execute", title: "You just show up", tagline: "Book. Drive. Done." },
];

export const LOGIN_CAROUSEL_MS = 3000;

/** Auto-rotate dwell (title only). Tagline shows on hover, focus, or manual browse. Transition ~700ms in globals.css */
