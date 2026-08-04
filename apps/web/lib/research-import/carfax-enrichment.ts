import type {
  ResearchImportDraft,
  ResearchProviderLocation,
  ResearchRecordKind,
  ResearchReportedBy,
  ResearchServiceDetailStatus,
  ResearchServiceRecord,
} from "./types";

const genericServicePattern = /^(vehicle )?(serviced|service performed|maintenance performed|service completed)$/i;
const reviewLinkPattern = /(?:https?:\/\/)?(?:www\.)?carfax\.com\/Reviews-([A-Za-z0-9-]+)(?:_[A-Za-z0-9_-]+)?/gi;

type ReviewLinkLocation = {
  city: string;
  state: string;
  index: number;
};

const notReportedLocation = (): ResearchProviderLocation => ({
  city: null,
  state: null,
  status: "not-reported",
  source: null,
});

const carfaxSlug = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const normalizedDateTokens = (value: string | null): string[] => {
  if (!value) return [];
  const parsed = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(value);
  if (!parsed) return [value];
  const [, year, month, day] = parsed;
  return [`${month}/${day}/${year}`, `${Number(month)}/${Number(day)}/${year}`, value];
};

const toCity = (slug: string): string =>
  slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.length <= 3 ? part.toUpperCase() : `${part[0]?.toUpperCase() ?? ""}${part.slice(1).toLowerCase()}`)
    .join(" ");

const locationsForProvider = (rawText: string, provider: string): ReviewLinkLocation[] => {
  const providerSlug = carfaxSlug(provider);
  if (!providerSlug) return [];
  const locations: ReviewLinkLocation[] = [];
  for (const match of rawText.matchAll(reviewLinkPattern)) {
    const sourceSlug = match[1] ?? "";
    const normalizedSourceSlug = sourceSlug.toLowerCase();
    if (!normalizedSourceSlug.startsWith(`${providerSlug}-`)) continue;
    const locationParts = sourceSlug.slice(providerSlug.length + 1).split("-").filter(Boolean);
    const state = locationParts.pop()?.toUpperCase() ?? "";
    const city = toCity(locationParts.join("-"));
    if (!/^[A-Z]{2}$/.test(state) || !city) continue;
    locations.push({ city, state, index: match.index ?? 0 });
  }
  return locations.filter((location, index, entries) =>
    entries.findIndex((candidate) => candidate.city === location.city && candidate.state === location.state) === index,
  );
};

const providerLocationFromReviewLinks = (rawText: string, record: ResearchServiceRecord): ResearchProviderLocation => {
  if (!record.provider || !rawText.trim()) return notReportedLocation();
  const candidates = locationsForProvider(rawText, record.provider);
  if (!candidates.length) return notReportedLocation();

  const dateTokens = normalizedDateTokens(record.serviceDate);
  const distances = dateTokens.length
    ? candidates.map((candidate) => ({
      candidate,
      distance: Math.min(...dateTokens.map((date) => {
        const dateIndex = rawText.indexOf(date);
        return dateIndex >= 0 ? Math.abs(candidate.index - dateIndex) : Number.POSITIVE_INFINITY;
      })),
    })).filter(({ distance }) => Number.isFinite(distance))
    : [];
  const nearestDistance = distances.length ? Math.min(...distances.map(({ distance }) => distance)) : null;
  const dateMatched = nearestDistance !== null && nearestDistance <= 1_600
    ? distances.filter(({ distance }) => distance === nearestDistance).map(({ candidate }) => candidate)
    : [];
  const unique = dateMatched.length ? dateMatched : candidates;
  if (unique.length !== 1) {
    return {
      city: null,
      state: null,
      status: "ambiguous",
      source: "carfax-review-link",
    };
  }
  return {
    city: unique[0].city,
    state: unique[0].state,
    status: "reported",
    source: "carfax-review-link",
  };
};

const recordText = (record: ResearchServiceRecord): string =>
  `${record.provider ?? ""}\n${record.lineItems.join("\n")}`.toLowerCase();

const recordKindFor = (record: ResearchServiceRecord): ResearchRecordKind => {
  const text = recordText(record);
  if (/\bregistration\b|\bmotor vehicle (?:dept|department)\b/.test(text)) return "registration";
  if (/\b(?:safety|emissions?) inspection\b/.test(text)) return "inspection";
  return "service";
};

const reportedByFor = (record: ResearchServiceRecord, recordKind: ResearchRecordKind): ResearchReportedBy => {
  const text = recordText(record);
  if (/\bself-service\b|\bdo it yourself\b|\bdiy\b/.test(text)) return "diy";
  if (/\bself reported\b|\bowner reported\b/.test(text)) return "owner";
  if (/\bmotor vehicle (?:dept|department)\b|\bdepartment of motor vehicles\b/.test(text)) return "government";
  if (recordKind === "inspection" && /\bmassachusetts\b|\bstate inspection\b/.test(text)) return "government";
  return record.provider ? "shop" : "unknown";
};

const serviceDetailStatusFor = (record: ResearchServiceRecord, recordKind: ResearchRecordKind): ResearchServiceDetailStatus => {
  if (recordKind !== "service") return "not-applicable";
  if (!record.lineItems.length || record.lineItems.every((item) => genericServicePattern.test(item.trim()))) return "not-itemized";
  return "itemized";
};

const evidencePagesFor = (pages: number[]): number[] =>
  [...new Set(pages.filter((page) => Number.isInteger(page) && page > 0))].sort((left, right) => left - right);

const enrichRecord = (record: ResearchServiceRecord, rawText: string): ResearchServiceRecord => {
  const recordKind = recordKindFor(record);
  return {
    ...record,
    evidencePages: evidencePagesFor(record.evidencePages),
    recordKind,
    reportedBy: reportedByFor(record, recordKind),
    serviceDetailStatus: serviceDetailStatusFor(record, recordKind),
    // The model may propose a location, but no location is retained until this
    // deterministic match finds the provider's printed CARFAX review-link.
    providerLocation: providerLocationFromReviewLinks(rawText, record),
  };
};

export const enrichResearchCarfaxDraft = (draft: ResearchImportDraft, rawText: string): ResearchImportDraft => ({
  ...draft,
  records: draft.records.map((record) => enrichRecord(record, rawText)),
  warnings: [...draft.warnings],
});
