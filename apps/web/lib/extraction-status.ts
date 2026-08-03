export type ExtractionStatusVariant =
  | "llm-not-ready-manual"
  | "llm-not-ready-pdf"
  | "llm-not-ready-receipt"
  | "upcoming-oem-search"
  | "upcoming-places-lookup";

export type ExtractionStatusContent = {
  title: string;
  body: string;
  attribution?: {
    label: string;
    href: string;
  };
};

export const EXTRACTION_STATUS: Record<ExtractionStatusVariant, ExtractionStatusContent> = {
  "llm-not-ready-manual": {
    title: "LLM extraction not yet initialized",
    body: "Parsed fields cannot be read from this file yet — enter or review details manually below. When LLM extraction ships, results will be stored in the audit event log alongside the uploaded artifact.",
  },
  "llm-not-ready-pdf": {
    title: "LLM extraction not yet initialized",
    body: "PDF parsing uses rules-only extraction today (messy layouts may miss rows). For dogfood testing, load the JSON fixture below. LLM-assisted PDF extract is an upcoming feature.",
  },
  "llm-not-ready-receipt": {
    title: "LLM extraction not yet initialized",
    body: "Your receipt is stored in the evidence vault. Structured parsing (shop, date, line items) is manual today — full LLM extraction ships with ENG-2. Hand off now; the assistant will ask you to verify fields when parsing is ready.",
  },
  "upcoming-oem-search": {
    title: "OEM schedule packs",
    body: "Supported year/make/model/trim combinations load a verified maintenance schedule automatically when you pick from the catalog. Unsupported vehicles join the waitlist on vehicleos.app — they cannot create an account vehicle yet.",
  },
  "upcoming-places-lookup": {
    title: "Shop location lookup",
    body: "Missing dealer locations are resolved from your saved shop memory and Geoapify location lookup when you load or confirm an import. If a shop still needs review, add city/state once — we'll remember it for next time.",
    attribution: {
      label: "Location data by Geoapify",
      href: "https://www.geoapify.com/",
    },
  },
};
