import { siteConfig } from "./site-config";

export const trustMeta = {
  privacy: {
    title: "Privacy — VehicleOS",
    description:
      "What VehicleOS collects, why we use it, how long we keep it, and your rights as an early-access owner.",
  },
  security: {
    title: "Security — VehicleOS",
    description:
      "How VehicleOS protects owner data in early access — hosting, encryption, access controls, and AI boundaries.",
  },
  terms: {
    title: "Terms of Service — VehicleOS",
    description: "Early-access terms for the VehicleOS owner app — acceptable use, service scope, and account basics.",
  },
} as const;

export const privacySections = [
  {
    id: "overview",
    title: "Overview",
    paragraphs: [
      "VehicleOS is operational memory for vehicle ownership. During early access we collect only what we need to run the hosted app at app.vehicleos.app — not to sell data or build ad profiles.",
    ],
  },
  {
    id: "collect",
    title: "What we collect",
    bullets: [
      "Account: email address and OAuth profile from Google or GitHub sign-in (via Supabase Auth).",
      "Vehicle data you enter: VIN, year, make, model, mileage, and service receipts you confirm in the app.",
      "Domain events: an append-only history of vehicle state changes (service recorded, tasks approved, and similar) stored in Postgres.",
      "Technical logs: standard hosting logs from Vercel and Supabase (request metadata, errors) for reliability — not used for advertising.",
    ],
  },
  {
    id: "why",
    title: "Why we use it",
    bullets: [
      "Authenticate you and keep your vehicles private to your account.",
      "Run the maintenance timeline, Now queue, and golden-path loop you see in the app.",
      "Improve reliability and fix bugs during early access.",
    ],
  },
  {
    id: "retention",
    title: "Retention",
    paragraphs: [
      "We keep your account and vehicle data while you use early access. If you delete your account, we remove associated Postgres rows and your Supabase Auth user.",
      "Hosting logs rotate on vendor schedules (typically days to weeks). We do not retain deleted vehicle rows after a successful account deletion.",
    ],
  },
  {
    id: "rights",
    title: "Your rights",
    bullets: [
      `Request a copy of your data before deleting — email ${siteConfig.contactEmail}.`,
      "Delete your account and associated vehicle data from Settings in the app. Deletion is permanent and removes your sign-in.",
      "We do not sell your personal information or vehicle history to third parties.",
    ],
  },
  {
    id: "sharing",
    title: "Sharing & subprocessors",
    bullets: [
      "Vercel — hosts the Owners web app and API route handlers.",
      "Supabase — hosts Postgres and authentication (Google/GitHub OAuth).",
      "We do not share your vehicle data with CARFAX, dealers, or LLM providers as part of the golden-path loop today.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      `Questions about privacy or data rights: ${siteConfig.contactEmail}.`,
      "We aim to respond within a few business days during early access.",
    ],
  },
] as const;

export const termsSections = [
  {
    id: "overview",
    title: "Overview",
    paragraphs: [
      "These terms apply to the VehicleOS owner app during free early access at app.vehicleos.app. By signing in, you agree to use the service responsibly and understand it is evolving software — not dealer, legal, or mechanical advice.",
    ],
  },
  {
    id: "service",
    title: "What we provide",
    bullets: [
      "A hosted workspace to store vehicle context you confirm — receipts, notes, manuals, and schedule rules.",
      "Recommendations and reminders driven by rules-first policy — you approve changes before they affect your timeline.",
      "Early access may change, pause, or limit features without notice while we dogfood and improve the product.",
    ],
  },
  {
    id: "use",
    title: "Acceptable use",
    bullets: [
      "Use your own account — do not attempt to access another owner's vehicle data.",
      "Do not upload malware, illegal content, or material you do not have the right to store.",
      "Do not scrape, reverse-engineer, or abuse API endpoints beyond normal app use.",
    ],
  },
  {
    id: "advice",
    title: "Not professional advice",
    paragraphs: [
      "VehicleOS helps you organize history and surface plain-English guidance. It does not replace a certified mechanic, dealer service advisor, or legal counsel. You remain responsible for maintenance decisions and shop visits.",
    ],
  },
  {
    id: "account",
    title: "Account & termination",
    bullets: [
      "Sign in with Google or GitHub via Supabase Auth — we never receive your password.",
      "You may delete your account from Settings; deletion removes your hosted vehicle data per our Privacy Policy.",
      "We may suspend access for abuse or security risk during early access.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      `Questions about these terms: ${siteConfig.contactEmail}.`,
      "See also our Privacy and Security pages for data handling details.",
    ],
  },
] as const;

export const securitySections = [
  {
    id: "overview",
    title: "Overview",
    paragraphs: [
      "VehicleOS early access runs on managed cloud services with encryption in transit. We design for explainability and least privilege — not enterprise SOC2 certification in Phase 0.",
    ],
  },
  {
    id: "hosting",
    title: "Where data lives",
    bullets: [
      "Owners app and synchronous API: Vercel (United States regions).",
      "Postgres database and auth: Supabase (AWS-backed, project region shown in your Supabase dashboard).",
      "Vehicle OS Connect CLI imports run on your machine — import files are not uploaded to our servers in the v0 CLI flow.",
    ],
  },
  {
    id: "transit",
    title: "Encryption in transit",
    bullets: [
      "All web traffic uses HTTPS (TLS).",
      "Database connections from the app use TLS via Supabase connection strings.",
      "OAuth tokens are handled by Supabase Auth — we do not store your Google or GitHub password.",
    ],
  },
  {
    id: "access",
    title: "Access controls",
    bullets: [
      "Production database credentials and Supabase service keys live in Vercel environment variables — never in the browser.",
      "API routes require a signed-in session; vehicle rows are scoped to your user id on the server.",
      "The open-core GitHub repo is public for architecture review; your hosted account data is not.",
    ],
  },
  {
    id: "ai",
    title: "AI & data boundaries",
    bullets: [
      "The schedule engine and Now queue are rules-first — deterministic policy, not an LLM deciding what is due.",
      "When LLM extraction ships for receipts, we will document what fields leave your account and why.",
      "Today’s golden path uses structured receipt fields you confirm in the UI — no document sent to an external model in that flow.",
    ],
  },
  {
    id: "report",
    title: "Report a concern",
    paragraphs: [
      `Security questions or vulnerability reports: ${siteConfig.contactEmail} with subject “VehicleOS security”.`,
      "Please do not include live credentials in email.",
    ],
  },
] as const;
