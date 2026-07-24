export const siteConfig = {
  name: "VehicleOS",
  tagline: "Your car's reminding assistant — not another dashboard.",
  metaTitle: "VehicleOS — Hire a reminding assistant for your car",
  metaDescription:
    "Free early access for car owners. Hand off service history once — your assistant plans, tracks, and sends calendar-first reminders in the background. Snooze when you need to. Stop planning.",
  githubUrl: process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/karantyagi/VehicleOS",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vehicleos.app",
  linkedInUrl: process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "https://www.linkedin.com/in/karantyagi-21",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@vehicleos.app",
  demoLoomUrl: process.env.NEXT_PUBLIC_DEMO_LOOM_URL ?? "",
} as const;

export const heroContent = {
  hook: "Your car's reminding assistant",
  headline: "Stop planning.",
  headlineHighlight: "Just show up.",
  outcomeLine:
    "Hand off your records once. Your assistant remembers everything, projects what's due, and nudges you only when it matters.",
  engineeringLine:
    "Rules-first schedules · plain-English why · AI for extraction and explanation — not guesswork",
  problem:
    "Maintenance lives in your head, glove box, and camera roll — until something gets missed. You shouldn't be the planner.",
  oneLiner:
    "What's due next — with plain-English why, from your actual service history.",
} as const;

export const heroPills = [
  "Free early access",
  "Light-touch reminders",
  "Calendar-first for you",
] as const;

export const earlyAccessContent = {
  sectionLabel: "Early access",
  sectionTitle: "Hire your reminding assistant",
  sectionDesc:
    "Free hosted early access. Sign in, hand off your history, answer a few basics about your car — then let the assistant work in the background.",
  wedge: "Know what's due next, with plain-English why, from your actual service history.",
  priceNote: "Early access · free",
  highlights: [
    "One-time handoff — receipts, history PDFs, owner manual (not a daily logbook)",
    "Calendar-first reminders — act this week or snooze; assistant escalates if you defer",
    "Light-touch nudges in the background — mileage math stays on the assistant",
    "Owner verification only when data conflicts — fewer each week as memory grows",
    "You execute — book, pay, show up. No planning overhead.",
  ],
  cta: {
    label: "Open the app",
    href: process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vehicleos.app",
  },
  ctaSecondary: { label: "Watch demo", href: "#demo" },
} as const;

export const trustSignals = [
  { label: "Free early access", detail: "Hosted app · no terminal" },
  { label: "Low cognitive load", detail: "Assistant plans · you execute" },
  { label: "Nothing missed", detail: "Timely reminders + evidence" },
  { label: "Explainable", detail: "Rules own truth · AI at edges" },
] as const;

export const coreLoopSteps = [
  { label: "Hand off", detail: "Records, receipts, owner manual" },
  { label: "Remember", detail: "Event-sourced history + evidence" },
  { label: "Project", detail: "OEM intervals and what's ahead" },
  { label: "Remind", detail: "Calendar deadlines — snooze or act; assistant remembers mileage" },
  { label: "Verify", detail: "Owner confirms only when blocked" },
] as const;

/** Positioning copy — gap cards on main `#positioning`; Option A archived on `/design-preview`. */
export const positioningContent = {
  sectionLabel: "Where this fits",
  sectionTitle: "Three tools people already reach for",
  intro:
    "History reports are a snapshot. General AI helps once — then forgets. Neither stays on the job month after month, sending calendar reminders before something slips.",
  footnote:
    "VehicleOS is the reminding assistant that keeps your car's story — so maintenance stays on time without you carrying the planner in your head.",
  gapCards: [
    {
      id: "history",
      label: "History reports",
      line: "Snapshot — not ongoing memory",
    },
    {
      id: "ai",
      label: "General AI",
      line: "Helpful once — starts from zero",
    },
    {
      id: "vehicleos",
      label: "VehicleOS",
      line: "Hand off once → reminds → nothing missed",
      highlight: true,
    },
  ],
} as const;

export const aiNativeBlurb =
  "Vehicle OS is built AI-native. One architect (human) sets product scope, system boundaries, and trust rules. Cursor agents implement from briefs and ADRs. Deterministic engines own vehicle state and schedules; LLMs handle extraction and explanation only. The result: Staff-level velocity without losing explainability or coherence.";

export const adrs = [
  {
    id: "ADR-001",
    title: "Postgres + pgvector as core data platform",
    href: "https://github.com/karantyagi/VehicleOS/blob/main/docs-lite/adr/ADR-001-postgres-pgvector.md",
  },
  {
    id: "ADR-002",
    title: "Event-sourced domain model",
    href: "https://github.com/karantyagi/VehicleOS/blob/main/docs-lite/adr/ADR-002-event-sourced-domain-model.md",
  },
  {
    id: "ADR-003",
    title: "Lakehouse evolution (v2 scale path)",
    href: "https://github.com/karantyagi/VehicleOS/blob/main/docs-lite/adr/ADR-003-lakehouse-evolution.md",
  },
  {
    id: "ADR-004",
    title: "Phase 0 hosted deployment (Vercel + Supabase)",
    href: "https://github.com/karantyagi/VehicleOS/blob/main/docs-lite/adr/ADR-004-phase0-hosted-deployment.md",
  },
  {
    id: "ADR-005",
    title: "Owners-only positioning — hosted early access",
    href: "https://github.com/karantyagi/VehicleOS/blob/main/docs-lite/adr/ADR-005-owners-only-positioning.md",
  },
] as const;

export type StatusRow = {
  item: string;
  status: "shipped" | "in-progress" | "planned";
};

export const statusRows: StatusRow[] = [
  { item: "Monorepo scaffold (marketing, web, api, worker)", status: "shipped" },
  { item: "Domain model + ADRs", status: "shipped" },
  { item: "MIT open-core license", status: "shipped" },
  { item: "Public landing page (Phase A)", status: "shipped" },
  { item: "Owners-only early access positioning (site + docs)", status: "shipped" },
  { item: "Golden-path integration test + CI", status: "shipped" },
  { item: "Evals methodology (public repo)", status: "shipped" },
  { item: "Vehicle OS Connect v0 CLI (validate / preview)", status: "shipped" },
  { item: "Receipt → recommendation vertical slice", status: "in-progress" },
  { item: "Demo video (YouTube stand-in; full V1 re-record at freeze)", status: "in-progress" },
  { item: "Hosted early-access app — API + Postgres + golden path", status: "shipped" },
  { item: "Privacy & security trust pages", status: "shipped" },
  { item: "Self-serve account deletion", status: "shipped" },
  { item: "Auth + vehicle onboarding wizard", status: "shipped" },
  { item: "Vehicle OS Connect desktop (Owners)", status: "planned" },
  { item: "SMS / email / push proactive reminders (calendar-first)", status: "planned" },
  { item: "Future subscription tiers (documented, not building)", status: "planned" },
  { item: "v2 lakehouse analytics path", status: "planned" },
];
