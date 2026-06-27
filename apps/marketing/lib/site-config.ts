export const siteConfig = {
  name: "VehicleOS",
  tagline: "Operational memory for long-lived car ownership.",
  metaTitle: "VehicleOS — Operational memory for vehicle ownership",
  metaDescription:
    "Explainable AI maintenance for vehicle ownership. Event-sourced state, deterministic policy, and AI-assisted extraction — built for owners who want proof, not another chat thread.",
  githubUrl: process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/karantyagi/VehicleOS",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vehicleos.app",
  linkedInUrl: process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "https://www.linkedin.com/in/karantyagi-21",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@vehicleos.app",
} as const;

export const heroContent = {
  hook: "Explainable AI maintenance for vehicle ownership",
  headline: "Operational memory for long-lived ownership",
  headlineHighlight: "long-lived ownership",
  problem:
    "First-time owners learn maintenance too late. Dealership quotes are hard to validate. ChatGPT helps — but every conversation starts from zero.",
  oneLiner:
    "The system of record I wished existed when I was trying to figure out if my dealer was being honest.",
} as const;

export const trustSignals = [
  { label: "Open core", detail: "MIT licensed" },
  { label: "Architecture", detail: "Event-sourced domain" },
  { label: "AI boundary", detail: "Rules own truth" },
  { label: "Build model", detail: "Human-led, AI-native" },
] as const;

export const coreLoopSteps = [
  { label: "Evidence", detail: "Receipts, mileage, service history" },
  { label: "State", detail: "Event-sourced vehicle projection" },
  { label: "Policy", detail: "Deterministic schedule engine" },
  { label: "Action", detail: "Recommendations with human approval" },
  { label: "Memory", detail: "Preferences and explainability" },
] as const;

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
] as const;

export type StatusRow = {
  item: string;
  status: "shipped" | "in-progress" | "planned";
};

export const statusRows: StatusRow[] = [
  { item: "Monorepo scaffold (marketing, web, api, worker)", status: "shipped" },
  { item: "Domain model + ADRs", status: "shipped" },
  { item: "MIT open-core license", status: "shipped" },
  { item: "Recruiter landing page (Phase A)", status: "shipped" },
  { item: "Receipt → recommendation vertical slice", status: "in-progress" },
  { item: "Demo video (Loom)", status: "in-progress" },
  { item: "Golden-path integration test + CI", status: "in-progress" },
  { item: "Hosted product (app.vehicleos.app)", status: "planned" },
  { item: "SMS / email proactive reminders", status: "planned" },
  { item: "Email receipt ingest (OAuth)", status: "planned" },
  { item: "v2 lakehouse analytics path", status: "planned" },
];
