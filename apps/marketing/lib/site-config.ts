export const siteConfig = {
  name: "VehicleOS",
  tagline: "Know what your car needs next.",
  metaTitle: "VehicleOS — Evidence-backed maintenance decisions",
  metaDescription:
    "Keep a confirmed service history, understand the next maintenance action, and stay in control of every decision.",
  githubUrl: process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/karantyagi/VehicleOS",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vehicleos.app",
  linkedInUrl: process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "https://www.linkedin.com/in/karantyagi-21",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@vehicleos.app",
  demoLoomUrl: process.env.NEXT_PUBLIC_DEMO_LOOM_URL ?? "",
} as const;

export const releaseNote = {
  label: "Early access · scope frozen",
  detail: "Five maintenance decisions, built deeply.",
} as const;

export const heroContent = {
  headline: "Know what your car",
  headlineHighlight: "needs next.",
  hook: "One calm place for confirmed history and an explainable next action.",
  subline:
    "Start with your vehicle and what you know. VehicleOS keeps service evidence reviewable, applies source-aware rules, and leaves the final decision with you.",
} as const;

export const heroPills = ["Free early access", releaseNote.label, "OEM-verified schedules"] as const;

export const earlyAccessContent = {
  sectionLabel: "Get started",
  sectionTitle: "Three steps to a clearer next action",
  sectionDesc: "Add your car, confirm the history you have, and see the next maintenance action with its evidence.",
  priceNote: "Free · early access",
} as const;

export const featuresContent = {
  sectionLabel: "Features",
  sectionTitle: "One owner-controlled maintenance loop",
  sectionDesc: "A narrow early-access product: evidence, a source-aware recommendation, and your decision.",
  badge: "Evidence · decision · owner control",
  priceNote: "Early access · free",
  executeCallout: "You decide. Record it, fix the evidence, or act when you are ready.",
  items: [
    {
      id: "oem",
      title: "Source-aware schedule",
      detail: "A supported vehicle starts with documented maintenance semantics instead of a generic reminder list.",
    },
    {
      id: "attention",
      title: "One next action",
      detail: "Home keeps the most relevant maintenance work visible without pretending notification delivery exists.",
    },
    {
      id: "history",
      title: "Confirmed history",
      detail: "Service evidence stays editable and reviewable. A correction immediately updates the next action.",
    },
    {
      id: "policy",
      title: "Five focused policies",
      detail: "Engine oil and filter, cabin filter, brakes, tire rotation, and tire replacement — each with its own evidence boundary.",
    },
    {
      id: "verify",
      title: "Correct, then recalculate",
      detail: "The assistant does not silently rewrite your history or maintenance interval.",
    },
    {
      id: "capture",
      title: "Capture for review",
      detail: "Photos, PDFs, and notes remain evidence for owner review; they are not automatic maintenance truth.",
    },
  ],
  cta: {
    label: "Check your car",
    href: "#supported",
  },
} as const;

export const setupSteps = [
  { step: "01", title: "Your car", detail: "Start with the supported vehicle and current mileage." },
  { step: "02", title: "Your history", detail: "Record or confirm the service facts you know." },
  { step: "03", title: "Your next action", detail: "See the evidence, then schedule, complete, correct, or decline." },
] as const;

export const trustSignals = [
  { label: "Free early access", detail: "Hosted · no terminal" },
  { label: "Owner decides", detail: "No silent writes" },
  { label: "Explainable", detail: "Sources + rules" },
] as const;

export const coreLoopSteps = [
  { label: "Record", detail: "Confirm service evidence" },
  { label: "Project", detail: "Calculate from source-aware rules" },
  { label: "Explain", detail: "Show why now and what is missing" },
  { label: "Decide", detail: "Schedule, complete, correct, or decline" },
  { label: "Recalculate", detail: "Update history and the next action" },
] as const;

export const loopContent = {
  sectionLabel: "How it works",
  sectionTitle: "Evidence first. Decision stays yours.",
  sectionDesc:
    "VehicleOS keeps the evidence, source-aware policy, and owner action separate so every next step is explainable.",
  diagramCaption: "Confirmed evidence in, owner-controlled action out",
} as const;

// This section intentionally remains unchanged while YouTube is the active demo host.
export const demoContent = {
  sectionLabel: "Product",
  sectionTitle: "See it in action",
  sectionDesc: "Pick car, OEM schedule, calendar reminders — optional import in under two minutes.",
  placeholderTitle: "Product walkthrough",
  placeholderDetail: "Full demo recording ships with v1.",
} as const;
