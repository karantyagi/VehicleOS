import type { ExtractedServiceFields } from "../events/catalog.js";

export type ParseVoiceServiceNoteInput = {
  transcript: string;
  defaultMileage?: number;
  referenceDate?: string;
};

export type ParsedVoiceServiceNote = ExtractedServiceFields & {
  transcript: string;
};

const MILEAGE_PATTERN = /(\d{1,3}(?:,\d{3})+|\d+)\s*(?:miles|mi|mileage)\b/i;
const TOTAL_PATTERN = /\$\s*(\d+(?:\.\d{2})?)/;
const ISO_DATE_PATTERN = /\b(\d{4}-\d{2}-\d{2})\b/;
const SLASH_DATE_PATTERN = /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/;
const AT_SHOP_PATTERN = /\b(?:at|from)\s+([^,.]+)/i;

const SERVICE_LINE_PATTERNS: { pattern: RegExp; lineItem: string }[] = [
  { pattern: /oil change|changed oil|oil & filter|synthetic oil/i, lineItem: "Oil change" },
  { pattern: /tire rotation|rotated tires/i, lineItem: "Tire rotation" },
  { pattern: /cabin filter|cabin air filter/i, lineItem: "Cabin air filter" },
  { pattern: /brake pad|brake service|brakes/i, lineItem: "Brake service" },
  { pattern: /battery/i, lineItem: "Battery service" },
  { pattern: /alignment/i, lineItem: "Wheel alignment" },
];

const normalizeMileage = (raw: string): number => Number(raw.replace(/,/g, ""));

const normalizeDate = (raw: string, referenceDate: string): string => {
  if (ISO_DATE_PATTERN.test(raw)) return raw;

  const slashMatch = raw.match(SLASH_DATE_PATTERN);
  if (!slashMatch?.[1]) return referenceDate.slice(0, 10);

  const [month, day, yearPart] = slashMatch[1].split("/");
  const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const inferLineItems = (transcript: string): string[] => {
  const matches = SERVICE_LINE_PATTERNS.filter(({ pattern }) => pattern.test(transcript)).map(
    ({ lineItem }) => lineItem,
  );

  if (matches.length > 0) return matches;

  const trimmed = transcript.trim();
  if (trimmed.length === 0) return ["Service noted"];

  return [trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed];
};

const inferShop = (transcript: string): string => {
  const match = transcript.match(AT_SHOP_PATTERN);
  if (!match?.[1]) return "Owner noted";

  const shop = match[1].trim();
  return shop.length > 0 ? shop : "Owner noted";
};

const scoreConfidence = (input: {
  hasMileage: boolean;
  hasTotal: boolean;
  hasServiceLine: boolean;
  hasShop: boolean;
}): number => {
  let score = 0.45;
  if (input.hasMileage) score += 0.25;
  if (input.hasTotal) score += 0.1;
  if (input.hasServiceLine) score += 0.15;
  if (input.hasShop) score += 0.05;
  return Math.min(score, 0.98);
};

export const parseVoiceServiceNote = (
  input: ParseVoiceServiceNoteInput,
): ParsedVoiceServiceNote | null => {
  const transcript = input.transcript.trim();
  if (!transcript) return null;

  const referenceDate = input.referenceDate ?? new Date().toISOString();
  const mileageMatch = transcript.match(MILEAGE_PATTERN);
  const mileage = mileageMatch
    ? normalizeMileage(mileageMatch[1])
    : input.defaultMileage;

  if (mileage === undefined || Number.isNaN(mileage)) return null;

  const totalMatch = transcript.match(TOTAL_PATTERN);
  const total = totalMatch ? `$${totalMatch[1]}` : "$0.00";

  const isoDateMatch = transcript.match(ISO_DATE_PATTERN);
  const slashDateMatch = transcript.match(SLASH_DATE_PATTERN);
  const serviceDate = isoDateMatch?.[1]
    ?? (slashDateMatch?.[0] ? normalizeDate(slashDateMatch[0], referenceDate) : referenceDate.slice(0, 10));

  const lineItems = inferLineItems(transcript);
  const shop = inferShop(transcript);
  const hasServiceLine = SERVICE_LINE_PATTERNS.some(({ pattern }) => pattern.test(transcript));

  return {
    transcript,
    shop,
    serviceDate,
    mileage,
    lineItems,
    total,
    confidence: scoreConfidence({
      hasMileage: Boolean(mileageMatch),
      hasTotal: Boolean(totalMatch),
      hasServiceLine,
      hasShop: shop !== "Owner noted",
    }),
  };
};
