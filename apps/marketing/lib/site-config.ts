export const siteConfig = {
  name: "VehicleOS",
  tagline: "Your car's reminding assistant — not another dashboard.",
  metaTitle: "VehicleOS — Hire a reminding assistant for your car",
  metaDescription:
    "Free early access now. Initial release in ~2 months. Hand off CARFAX or service history once — verified OEM schedules, calendar-first reminders, and plain-English why from your actual records.",
  githubUrl: process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/karantyagi/VehicleOS",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vehicleos.app",
  linkedInUrl: process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "https://www.linkedin.com/in/karantyagi-21",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@vehicleos.app",
  demoLoomUrl: process.env.NEXT_PUBLIC_DEMO_LOOM_URL ?? "",
} as const;

export const releaseNote = {
  label: "Initial release · ~8 weeks",
  detail: "Dogfooding in hosted early access today. v1 owner loop ships late 2026.",
} as const;

export const heroContent = {
  hook: "Your car's reminding assistant",
  headline: "Stop planning.",
  headlineHighlight: "Just show up.",
  outcomeLine:
    "Hand off your records once. Your assistant remembers everything, projects what's due from verified OEM schedules, and nudges you only when it matters.",
  engineeringLine:
    "Event-sourced truth · deterministic OEM packs · AI for extraction and explanation — not guesswork on what's due",
  problem:
    "Maintenance lives in your head, glove box, and camera roll — until something gets missed. You shouldn't be the planner.",
  oneLiner:
    "What's due next — with plain-English why, from your actual service history.",
} as const;

export const heroPills = [
  "Free early access · live today",
  releaseNote.label,
  "Calendar-first reminders",
] as const;

export const earlyAccessContent = {
  sectionLabel: "Early access",
  sectionTitle: "One owner workflow — setup to reminders",
  sectionDesc:
    "Sign in, add your vehicle, import history once, and let the assistant work in the background. No daily logbook. No shop portal. No second product surface.",
  wedge: "Know what's due next, with plain-English why, from your actual service history.",
  priceNote: "Early access · free",
  highlights: [
    "Verified OEM packs — supported year/make/trim loads maintenance intervals at setup (no PDF upload)",
    "Import history — CARFAX PDFs, portal exports, and RMV records in one skippable step",
    "Calendar-first reminders — act this week or snooze 1–4 weeks; assistant escalates if you defer",
    "Deterministic matching — CARFAX lines like “Oil and filter changed” map to OEM codes with CI fixtures",
    "Owner verification only when data conflicts — fewer each week as memory grows",
    "You execute — book, pay, show up. No planning overhead.",
  ],
  cta: {
    label: "Open the app",
    href: process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vehicleos.app",
  },
  ctaSecondary: { label: "Check compatibility first", href: "#supported" },
} as const;

export const setupSteps = [
  {
    step: "01",
    title: "Vehicle record",
    detail: "Year, make, model, trim, mileage — we check OEM pack support live.",
  },
  {
    step: "02",
    title: "Driving profile",
    detail: "Garage city, driving style, and annual miles anchor calendar projection.",
  },
  {
    step: "03",
    title: "Import history",
    detail: "Hand off CARFAX or portal PDFs once — skippable, but reminders get smarter immediately.",
  },
] as const;

export const trustSignals = [
  { label: "Free early access", detail: "Hosted app · no terminal" },
  { label: "Low cognitive load", detail: "Assistant plans · you execute" },
  { label: "Nothing missed", detail: "Timely reminders + evidence" },
  { label: "Explainable", detail: "Rules own truth · AI at edges" },
] as const;

export const coreLoopSteps = [
  { label: "Hand off", detail: "CARFAX, receipts, RMV PDFs — one-time import" },
  { label: "Hydrate", detail: "Verified OEM pack + alias bundles at vehicle create" },
  { label: "Remember", detail: "Event-sourced history + evidence vault" },
  { label: "Project", detail: "OEM intervals, baselines from your timeline" },
  { label: "Remind", detail: "Calendar deadlines — snooze or act" },
  { label: "Verify", detail: "Owner confirms only when blocked" },
] as const;

/** Positioning copy — gap cards on main `#positioning`. */
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
  "VehicleOS is built AI-native by a single staff-level architect. Product scope, trust boundaries, and ADRs are human-owned. Cursor agents implement from briefs. Deterministic engines own vehicle state, OEM schedules, and due-date policy; LLMs handle extraction, enrichment, and explanation on async paths only. The result: shipping velocity without losing explainability — the bar you'd expect from a senior engineer building agentic systems in production.";

const adrBase = `${siteConfig.githubUrl}/blob/main/docs-lite/adr`;

export const adrs = [
  {
    id: "ADR-002",
    title: "Event-sourced domain model",
    href: `${adrBase}/ADR-002-event-sourced-domain-model.md`,
  },
  {
    id: "ADR-010",
    title: "Deterministic service matching & OEM knowledge packs",
    href: `${adrBase}/ADR-010-deterministic-service-matching-and-oem-knowledge-packs.md`,
  },
  {
    id: "ADR-011",
    title: "Import enrichment, assistant review & shop memory",
    href: `${adrBase}/ADR-011-import-enrichment-assistant-review-and-shop-memory.md`,
  },
  {
    id: "ADR-009",
    title: "PDF record import (CARFAX / portal history)",
    href: `${adrBase}/ADR-009-pdf-record-import.md`,
  },
  {
    id: "ADR-001",
    title: "Postgres + pgvector as core data platform",
    href: `${adrBase}/ADR-001-postgres-pgvector.md`,
  },
  {
    id: "ADR-004",
    title: "Phase 0 hosted deployment (Vercel + Supabase)",
    href: `${adrBase}/ADR-004-phase0-hosted-deployment.md`,
  },
] as const;

export type StatusRow = {
  item: string;
  status: "shipped" | "in-progress" | "planned";
};

export const statusRows: StatusRow[] = [
  { item: "Hosted owner app — auth, onboarding wizard, assistant workspace", status: "shipped" },
  { item: "OEM knowledge packs + hydrate on vehicle create (PROC-KB)", status: "shipped" },
  { item: "Deterministic service-name matching (CARFAX → OEM codes)", status: "shipped" },
  { item: "CARFAX / portal PDF import + tiered row verification", status: "shipped" },
  { item: "Shop memory + Nominatim geocoding on import enrich", status: "shipped" },
  { item: "Calendar-first reminders with snooze (1–4 weeks)", status: "shipped" },
  { item: "Event-sourced domain + golden-path integration tests + CI", status: "shipped" },
  { item: "Supported-vehicle catalog API + onboarding support check", status: "shipped" },
  { item: "Privacy, security, and self-serve account deletion", status: "shipped" },
  { item: "Receipt capture + mobile PWA handoff", status: "in-progress" },
  { item: "LLM-assisted PDF extraction (receipts + messy imports)", status: "in-progress" },
  { item: "Demo video (full walkthrough at v1 freeze)", status: "in-progress" },
  { item: "OEM pack factory — Tier 1 passenger catalog (50 verified)", status: "shipped" },
  { item: "SMS / email / push proactive reminders", status: "planned" },
  { item: "Multi-vehicle garage switcher", status: "planned" },
  { item: "Vehicle OS Connect desktop (Owners)", status: "planned" },
];
