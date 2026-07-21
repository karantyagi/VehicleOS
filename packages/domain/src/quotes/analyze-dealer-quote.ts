export type QuoteLineVerdict = "fair" | "high" | "optional" | "necessary" | "unknown";

export type ParsedQuoteLine = {
  description: string;
  quotedAmount: number;
};

export type QuoteLineAnalysis = {
  description: string;
  quotedAmount: number;
  fairMin: number;
  fairMax: number;
  verdict: QuoteLineVerdict;
  reason: string;
};

export type QuoteAnalysisResult = {
  quoteId: string;
  shop?: string;
  lines: QuoteLineAnalysis[];
  totalQuoted: number;
  totalFairHigh: number;
  summary: string;
};

type QuoteRule = {
  pattern: RegExp;
  fairMin: number;
  fairMax: number;
  defaultVerdict: QuoteLineVerdict;
  reasonFair: string;
  reasonHigh: string;
};

const QUOTE_RULES: QuoteRule[] = [
  {
    pattern: /oil change|synthetic oil|lube oil filter/i,
    fairMin: 35,
    fairMax: 90,
    defaultVerdict: "necessary",
    reasonFair: "Routine oil change — price looks typical for this market.",
    reasonHigh: "Oil change quote is above typical independent-shop range.",
  },
  {
    pattern: /cabin air filter|cabin filter/i,
    fairMin: 25,
    fairMax: 55,
    defaultVerdict: "optional",
    reasonFair: "Cabin filter is often optional unless airflow smells or is blocked.",
    reasonHigh: "Cabin filter price is high — ask if they will use an OEM or premium filter.",
  },
  {
    pattern: /brake pad|brake rotor|brake fluid/i,
    fairMin: 150,
    fairMax: 450,
    defaultVerdict: "necessary",
    reasonFair: "Brake work can be necessary — confirm wear measurements before approving.",
    reasonHigh: "Brake quote is on the high side — get a second opinion or itemized parts/labor split.",
  },
  {
    pattern: /tire rotation|rotate tires/i,
    fairMin: 20,
    fairMax: 45,
    defaultVerdict: "optional",
    reasonFair: "Rotation is maintenance — often bundled or low cost at independents.",
    reasonHigh: "Rotation price is high for a basic service.",
  },
  {
    pattern: /alignment|wheel align/i,
    fairMin: 80,
    fairMax: 150,
    defaultVerdict: "necessary",
    reasonFair: "Alignment may be needed after suspension or tire wear issues.",
    reasonHigh: "Alignment quote exceeds typical one-time adjustment pricing.",
  },
  {
    pattern: /transmission flush|coolant flush|fuel injection/i,
    fairMin: 100,
    fairMax: 250,
    defaultVerdict: "optional",
    reasonFair: "Dealer often marks these optional unless OEM schedule or symptoms apply.",
    reasonHigh: "Upsell-style service — verify against your manual interval before paying.",
  },
];

const parseAmount = (text: string): number | null => {
  const match = text.match(/\$?\s*(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/);
  if (!match) return null;
  return Number(match[1].replace(/,/g, ""));
};

export const parseQuoteText = (rawText: string): ParsedQuoteLine[] => {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed: ParsedQuoteLine[] = [];

  for (const line of lines) {
    const amount = parseAmount(line);
    if (amount === null) continue;

    const description = line
      .replace(/\$?\s*\d{1,4}(?:,\d{3})*(?:\.\d{2})?/g, "")
      .replace(/^[-•*\d.)]+\s*/, "")
      .trim();

    if (description.length < 3) continue;

    parsed.push({ description, quotedAmount: amount });
  }

  return parsed;
};

const inferShop = (rawText: string): string | undefined => {
  const firstLine = rawText.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  if (!firstLine) return undefined;
  if (/dealer|toyota|honda|ford|chevrolet|bmw|mercedes|subaru/i.test(firstLine)) return firstLine.slice(0, 80);
  return undefined;
};

const analyzeLine = (line: ParsedQuoteLine): QuoteLineAnalysis => {
  const rule = QUOTE_RULES.find((candidate) => candidate.pattern.test(line.description));

  if (!rule) {
    return {
      description: line.description,
      quotedAmount: line.quotedAmount,
      fairMin: 0,
      fairMax: line.quotedAmount,
      verdict: "unknown",
      reason: "No benchmark rule yet — compare with an independent shop quote.",
    };
  }

  const isHigh = line.quotedAmount > rule.fairMax;
  const verdict: QuoteLineVerdict = isHigh ? "high" : rule.defaultVerdict;

  return {
    description: line.description,
    quotedAmount: line.quotedAmount,
    fairMin: rule.fairMin,
    fairMax: rule.fairMax,
    verdict,
    reason: isHigh ? rule.reasonHigh : rule.reasonFair,
  };
};

export const analyzeDealerQuote = (input: {
  rawText: string;
  quoteId?: string;
}): QuoteAnalysisResult => {
  const lines = parseQuoteText(input.rawText).map(analyzeLine);
  const totalQuoted = lines.reduce((sum, line) => sum + line.quotedAmount, 0);
  const totalFairHigh = lines.reduce((sum, line) => sum + line.fairMax, 0);
  const highCount = lines.filter((line) => line.verdict === "high").length;
  const optionalCount = lines.filter((line) => line.verdict === "optional").length;

  const summary =
    lines.length === 0
      ? "Could not parse line items — paste lines with descriptions and dollar amounts."
      : highCount > 0
        ? `${highCount} line item(s) look high vs typical ranges · ${optionalCount} may be optional upsells.`
        : optionalCount > 0
          ? `Quote looks mostly in range · ${optionalCount} item(s) are often optional — confirm before approving.`
          : "Quote line items fall within typical independent-shop ranges.";

  return {
    quoteId: input.quoteId ?? crypto.randomUUID(),
    shop: inferShop(input.rawText),
    lines,
    totalQuoted,
    totalFairHigh,
    summary,
  };
};
