export const siteConfig = {
  name: "VehicleOS",
  tagline: "Operational memory for long-lived car ownership.",
  metaTitle: "VehicleOS — Operational memory for vehicle ownership",
  metaDescription:
    "Explainable AI maintenance for vehicle ownership. Event-sourced state, rules-first policy, and AI at the edges — for owners who want the app, and builders who want the open core.",
  githubUrl: process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/karantyagi/VehicleOS",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vehicleos.app",
  linkedInUrl: process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "https://www.linkedin.com/in/karantyagi-21",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@vehicleos.app",
  demoLoomUrl: process.env.NEXT_PUBLIC_DEMO_LOOM_URL ?? "",
} as const;

export const heroContent = {
  hook: "Explainable AI maintenance for vehicle ownership",
  headline: "Operational memory for",
  headlineHighlight: "long-lived ownership",
  outcomeLine:
    "What's due. What's fair. What to do next — without starting over every time.",
  engineeringLine:
    "Event-sourced vehicle state · rules-first schedules · LLMs for extraction and explanation only",
  problem:
    "First-time owners learn maintenance too late. Dealership quotes are hard to validate. ChatGPT helps — but every conversation starts from zero.",
  oneLiner:
    "The system of record I wished existed when I was trying to figure out if my dealer was being honest.",
} as const;

export const productPathsContent = {
  sectionLabel: "Choose your path",
  sectionTitle: "Use the app or run it yourself",
  sectionDesc:
    "Same product, two ways in. Pick the path that fits — you can always explore the other later.",
  paths: [
    {
      id: "owners",
      badge: "Owners",
      title: "Use the app",
      tagline: "Let Vehicle OS work in the background.",
      description:
        "Web, mobile, and Vehicle OS Connect on desktop. Import your history, get reminders, check quotes — everything set up for you. No code to run.",
      priceNote: "Early access · free",
      highlights: [
        "We run it — no setup",
        "Connect desktop import (Mac & Windows)",
        "Reminders & quote checks",
        "Plain-English explainability",
      ],
      cta: { label: "Watch demo", href: "#demo" },
      ctaSecondary: {
        label: "Join waitlist",
        href: `mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@vehicleos.app"}?subject=VehicleOS%20early%20access`,
      },
    },
    {
      id: "builders",
      badge: "Builders",
      title: "Run it yourself",
      tagline: "Run Vehicle OS on your machine — full control, open core.",
      description:
        "Clone the MIT repo, self-host with Docker, use the CLI, and wire your own integrations. Free and fully auditable — fork it, star it, extend it.",
      priceNote: "Free · MIT open core",
      highlights: [
        "docker compose self-host",
        "CLI & integrations",
        "ADRs, evals, full source",
        "Optional MCP tools",
      ],
      cta: {
        label: "View on GitHub",
        href: process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/karantyagi/VehicleOS",
      },
    },
  ],
} as const;

export const trustSignals = [
  { label: "Open core", detail: "MIT · self-host path" },
  { label: "Architecture", detail: "Event-sourced domain" },
  { label: "AI boundary", detail: "Rules own truth" },
  { label: "0→1 product", detail: "Human-led, AI-native build" },
] as const;

export const coreLoopSteps = [
  { label: "Evidence", detail: "Receipts, mileage, service history" },
  { label: "State", detail: "Event-sourced vehicle projection" },
  { label: "Policy", detail: "Deterministic schedule engine" },
  { label: "Action", detail: "Recommendations with human approval" },
  { label: "Memory", detail: "Preferences and explainability" },
] as const;

/** Positioning copy — gap cards on main `#positioning`; Option A archived on `/design-preview`. */
export const positioningContent = {
  sectionLabel: "Where this fits",
  sectionTitle: "Three tools people already reach for",
  intro:
    "CARFAX is useful for history. ChatGPT is useful for a quick second opinion. Neither was built to remember your car month after month — what's due, what you already paid for, and what to do next without starting over.",
  footnote:
    "Vehicle OS isn't a replacement for a history report or a one-off AI answer. It's the layer that keeps your car's story — so reminders, quote checks, and explanations build on what you already know.",
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
      label: "Vehicle OS",
      line: "Remembers → reminds → explains with evidence",
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
  { item: "Owners & Builders path chooser on site", status: "shipped" },
  { item: "Golden-path integration test + CI", status: "shipped" },
  { item: "Evals methodology (public repo)", status: "shipped" },
  { item: "Vehicle OS Connect v0 CLI (validate / preview)", status: "shipped" },
  { item: "Receipt → recommendation vertical slice", status: "in-progress" },
  { item: "Demo video (YouTube stand-in; full V1 re-record at freeze)", status: "in-progress" },
  { item: "Hosted Owners app — API + Postgres + golden path", status: "shipped" },
  { item: "Privacy & security trust pages", status: "shipped" },
  { item: "Self-serve account deletion", status: "shipped" },
  { item: "Auth + vehicle onboarding wizard", status: "shipped" },
  { item: "Vehicle OS Connect desktop (Owners)", status: "planned" },
  { item: "SMS / email proactive reminders", status: "planned" },
  { item: "Builders docker self-host path", status: "planned" },
  { item: "Future subscription tiers (documented, not building)", status: "planned" },
  { item: "v2 lakehouse analytics path", status: "planned" },
];
