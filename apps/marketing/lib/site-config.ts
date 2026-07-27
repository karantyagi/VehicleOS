export const siteConfig = {
  name: "VehicleOS",
  tagline: "Stop planning your car's maintenance.",
  metaTitle: "VehicleOS — Maintenance assistant for your car",
  metaDescription:
    "Hand off your CARFAX once. An assistant that remembers everything, schedules maintenance, and nudges you before something slips.",
  githubUrl: process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/karantyagi/VehicleOS",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vehicleos.app",
  linkedInUrl: process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "https://www.linkedin.com/in/karantyagi-21",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@vehicleos.app",
  demoLoomUrl: process.env.NEXT_PUBLIC_DEMO_LOOM_URL ?? "",
} as const;

export const releaseNote = {
  label: "Early access · live",
  detail: "Dogfooding now · v1 ships late 2026.",
} as const;

export const heroContent = {
  headline: "Stop planning your car's",
  headlineHighlight: "maintenance.",
  hook: "An assistant with one job — schedule maintenance and send reminders.",
  subline:
    "Hand off your CARFAX once. It remembers everything, plans what's ahead, and nudges you when something is coming up.",
} as const;

export const heroPills = ["Free early access", releaseNote.label, "OEM-verified schedules"] as const;

export const earlyAccessContent = {
  sectionLabel: "Get started",
  sectionTitle: "Three steps, then the assistant runs",
  sectionDesc: "Check compatibility, sign in, import once — reminders start from real history and OEM schedules.",
  priceNote: "Free · early access",
  cta: {
    label: "Open the app",
    href: process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vehicleos.app",
  },
  ctaSecondary: { label: "Check your car", href: "#supported" },
} as const;

export const featuresContent = {
  sectionLabel: "Features",
  sectionTitle: "Owners · one workflow",
  sectionDesc: "Everything in early access today — one assistant surface, no second app to check.",
  badge: "Owners · one workflow",
  priceNote: "Early access · free",
  executeCallout: "You execute. Book, pay, and show up. No planning overhead.",
  items: [
    {
      id: "oem",
      title: "Verified OEM packs",
      detail: "Supported year, make, and trim loads maintenance intervals at setup — no manual PDF hunt.",
    },
    {
      id: "import",
      title: "Import history",
      detail: "CARFAX PDFs, portal exports, and RMV records in one skippable step.",
    },
    {
      id: "reminders",
      title: "Calendar-first reminders",
      detail: "Act this week or snooze 1–4 weeks — the assistant escalates if you defer.",
    },
    {
      id: "matching",
      title: "Deterministic matching",
      detail: "CARFAX lines like “Oil and filter changed” map to OEM codes — tested with CI fixtures.",
    },
    {
      id: "verify",
      title: "Verify only on conflict",
      detail: "Owner confirmation when data conflicts — fewer each week as memory grows.",
    },
    {
      id: "execute",
      title: "You execute",
      detail: "Book, pay, and show up. The assistant plans — you don't carry the planner in your head.",
    },
  ],
  cta: {
    label: "Open the app",
    href: process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vehicleos.app",
  },
  ctaSecondary: { label: "Check your car", href: "#supported" },
} as const;

export const setupSteps = [
  { step: "01", title: "Your car", detail: "Year, make, model, trim — live OEM pack check." },
  { step: "02", title: "How you drive", detail: "City, style, miles — anchors the calendar." },
  { step: "03", title: "Import once", detail: "CARFAX or portal PDF — optional, recommended." },
] as const;

export const trustSignals = [
  { label: "Free early access", detail: "Hosted · no terminal" },
  { label: "You execute", detail: "Assistant plans" },
  { label: "Explainable", detail: "Rules + ADRs" },
] as const;

export const coreLoopSteps = [
  { label: "Hand off", detail: "CARFAX or portal PDF — once" },
  { label: "Hydrate", detail: "OEM schedule for your trim" },
  { label: "Remember", detail: "History and evidence on file" },
  { label: "Project", detail: "What's due — OEM + your miles" },
  { label: "Remind", detail: "Calendar nudge — snooze or act" },
  { label: "Verify", detail: "You confirm only on conflict" },
] as const;

export const loopContent = {
  sectionLabel: "How it works",
  sectionTitle: "Hand off once. Get nudged. Show up.",
  sectionDesc:
    "One import builds memory. The assistant projects what's ahead and nudges you — you step in only when data conflicts.",
  diagramCaption: "Same flow — records in, reminders out",
} as const;

export const demoContent = {
  sectionLabel: "Product",
  sectionTitle: "See it in action",
  sectionDesc: "Import, OEM hydrate, calendar reminders — the owner loop in under two minutes.",
  placeholderTitle: "Product walkthrough",
  placeholderDetail: "Full demo recording ships with v1.",
} as const;

export const versionLadder = {
  sectionLabel: "Roadmap",
  sectionTitle: "v1 reminds · v2 recommends",
  cards: [
    {
      id: "v1",
      badge: "v1",
      phase: "Now · early access",
      title: "Reminds what's upcoming",
      detail: "Projects from OEM schedules and your history. Nudges before something slips.",
      bullets: ["Calendar-first reminders", "Snooze 1–4 weeks", "Owner verify only on conflict"],
    },
    {
      id: "v2",
      badge: "v2",
      phase: "Next",
      title: "Recommends how, where, and cost",
      detail: "Same memory — plus paths that fit your time and budget.",
      bullets: [
        "How — DIY, dealer, local shop, Costco-style",
        "Where — location-aware options",
        "Cost — time and money, side by side",
      ],
    },
  ],
} as const;

export const positioningContent = {
  sectionLabel: "Compare",
  sectionTitle: "Three tools people already reach for",
  intro:
    "History reports are a snapshot. General AI helps once — then forgets. Neither stays on the job month after month.",
  footnote:
    "VehicleOS is the reminding assistant that keeps your car's story — maintenance stays on time without you as the planner.",
  columns: [
    { id: "history", label: "History reports", subtitle: "CARFAX · portal PDF" },
    { id: "ai", label: "General AI", subtitle: "ChatGPT · Gemini" },
    { id: "vehicleos", label: "VehicleOS", subtitle: "Reminding assistant", highlight: true },
  ],
  rows: [
    {
      id: "memory",
      label: "Memory",
      history: "One-time snapshot",
      ai: "Starts from zero each chat",
      vehicleos: "Hand off once — keeps the full story",
    },
    {
      id: "reminders",
      label: "Reminders",
      history: "None — you check manually",
      ai: "You have to ask again",
      vehicleos: "Calendar nudges before due dates",
    },
    {
      id: "schedule",
      label: "OEM schedule",
      history: "Not built in",
      ai: "May guess or hallucinate",
      vehicleos: "Verified packs for your trim",
    },
    {
      id: "ongoing",
      label: "Stays on the job",
      history: "No",
      ai: "No",
      vehicleos: "Yes — month after month",
    },
  ],
} as const;

export const aiNativeBlurb =
  "Staff-level architecture. ADRs own truth boundaries. Agents implement; deterministic engines own schedules and due dates. LLMs on async extraction only.";

export const architectureBlurb =
  "Event-sourced domain · versioned OEM JSON · rules-first policy. Diagrams and ADRs below — for engineers who care how it's built.";

const adrBase = `${siteConfig.githubUrl}/blob/main/docs-lite/adr`;

export const adrs = [
  {
    id: "ADR-002",
    title: "Event-sourced domain model",
    href: `${adrBase}/ADR-002-event-sourced-domain-model.md`,
  },
  {
    id: "ADR-010",
    title: "Deterministic service matching & OEM packs",
    href: `${adrBase}/ADR-010-deterministic-service-matching-and-oem-knowledge-packs.md`,
  },
  {
    id: "ADR-011",
    title: "Import enrichment & assistant review",
    href: `${adrBase}/ADR-011-import-enrichment-assistant-review-and-shop-memory.md`,
  },
  {
    id: "ADR-009",
    title: "PDF record import",
    href: `${adrBase}/ADR-009-pdf-record-import.md`,
  },
] as const;

export type StatusRow = {
  item: string;
  status: "shipped" | "in-progress" | "planned";
};

export const statusRows: StatusRow[] = [
  { item: "Hosted app — onboarding + assistant workspace", status: "shipped" },
  { item: "OEM packs + hydrate on vehicle create", status: "shipped" },
  { item: "CARFAX / RMV import + tiered review", status: "shipped" },
  { item: "Calendar reminders + snooze", status: "shipped" },
  { item: "Event-sourced domain + CI golden path", status: "shipped" },
  { item: "v2 — how / where / cost recommendations", status: "planned" },
  { item: "LLM PDF extraction", status: "planned" },
  { item: "Demo walkthrough video", status: "in-progress" },
];
