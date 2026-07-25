export type ExtractionStatusVariant =
  | "llm-not-ready-manual"
  | "llm-not-ready-pdf"
  | "llm-not-ready-receipt"
  | "upcoming-oem-search"
  | "upcoming-places-lookup"
  | "upcoming-shop-disambiguation-llm";

export type ExtractionStatusContent = {
  title: string;
  body: string;
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
    title: "Upcoming — assistant finds your OEM manual",
    body: "Soon the assistant will locate your year/make/model maintenance schedule via an internal search agent and pre-populate intervals — no PDF upload required. Until then, use JSON dogfood fixtures or enter intervals manually after upload.",
  },
  "upcoming-places-lookup": {
    title: "Shop location lookup",
    body: "Missing dealer locations are resolved from your saved shop memory and OpenStreetMap geocoding (Nominatim) when you load or confirm an import. If a shop still needs review, add city/state once — we'll remember it for next time.",
  },
  "upcoming-shop-disambiguation-llm": {
    title: "LLM shop disambiguation not yet initialized",
    body: "When geocoding returns multiple matches and you need help choosing, a future LLM step may propose the best city/state — you always confirm before we save. Until then, use the location buttons on the row or type city/state manually.",
  },
};

/** Static dogfood fixtures served from /dogfood/karan-tlx/ */
export const DOGFOOD_FIXTURES = {
  carfax: "/dogfood/karan-tlx/carfax-history.v1.json",
  rmv: "/dogfood/karan-tlx/rmv-records.v1.json",
  oemSchedule: "/dogfood/karan-tlx/oem-schedule.v1.json",
} as const;

export const fetchDogfoodJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load dogfood fixture (${response.status}).`);
  }
  return (await response.json()) as T;
};
