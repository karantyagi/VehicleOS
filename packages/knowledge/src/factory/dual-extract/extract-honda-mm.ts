import type { ExtractedScheduleRow } from "./types.js";

const pageMarker = (page: number, label: string): string => `P. ${page} — ${label}`;

const footnoteMonths = (text: string, marker: string, fallback: number | null): number | null => {
  const regex = new RegExp(`\\*${marker}:[\\s\\S]{0,120}?(\\d+)\\s*(?:months?|mo\\b)`, "i");
  const match = text.match(regex);
  if (match) return Number.parseInt(match[1], 10);
  const yearMatch = text.match(new RegExp(`\\*${marker}:[\\s\\S]{0,120}?(\\d+)\\s*years?`, "i"));
  if (yearMatch) return Number.parseInt(yearMatch[1], 10) * 12;
  return fallback;
};

const footnoteMiles = (text: string, marker: string): number | null => {
  const match = text.match(new RegExp(`\\*${marker}:[\\s\\S]{0,160}?(\\d{1,3}(?:,\\d{3})+|\\d+)\\s*(?:mi|miles|km)`, "i"));
  if (!match) return null;
  const value = Number.parseInt(match[1].replace(/,/g, ""), 10);
  if (/km/i.test(match[0])) return Math.round(value * 0.621371);
  return value;
};

const hasCode = (text: string, code: string, kind: "main" | "sub"): boolean => {
  if (kind === "main") {
    return new RegExp(`CODE\\s*Maintenance Main Items[\\s\\S]{0,400}\\b${code}\\b`, "i").test(text)
      || new RegExp(`Main Items[\\s\\S]{0,200}\\b${code}\\b[\\s\\S]{0,40}Replace engine oil`, "i").test(text);
  }
  return new RegExp(`Sub Items[\\s\\S]{0,500}\\b${code}\\b`, "i").test(text)
    || new RegExp(`\\b${code}\\b[\\s\\S]{0,80}Rotate tires`, "i").test(text);
};

/** Honda/Acura Maintenance Minder supplement — dual passes share footnote truth. */
export const extractMaintenanceMinderRows = (input: {
  text: string;
  pageHint: number;
  variant: "structural" | "footnote";
}): ExtractedScheduleRow[] => {
  const { text, pageHint, variant } = input;
  const rows: ExtractedScheduleRow[] = [];

  const pushMain = (rowKey: string, code: string, serviceName: string): void => {
    if (!hasCode(text, code, "main")) return;
    const months = footnoteMonths(text, "1", 12);
    rows.push({
      rowKey,
      serviceName,
      intervalMiles: null,
      intervalMonths: variant === "footnote" ? months : months,
      sourcePage: pageMarker(pageHint, `Code ${code}`),
      mainItemCode: code,
    });
  };

  const pushSub = (
    rowKey: string,
    code: string,
    serviceName: string,
    months: number | null,
    miles: number | null,
    extra?: string,
  ): void => {
    if (!hasCode(text, code, "sub")) return;
    rows.push({
      rowKey,
      serviceName,
      intervalMiles: miles,
      intervalMonths: months,
      sourcePage: extra ? `${pageMarker(pageHint, `Sub ${code}`)}; ${extra}` : pageMarker(pageHint, `Sub ${code}`),
      subItemCode: code,
    });
  };

  pushMain("code-a", "A", "Replace engine oil (Maintenance Minder A)");
  pushMain("code-b", "B", "Replace engine oil and filter (Maintenance Minder B)");

  const tireMonths = variant === "structural" ? 12 : 12;
  pushSub("mm-sub-1", "1", "Rotate tires (Maintenance Minder sub 1)", tireMonths, 7500);

  const transMonths = footnoteMonths(text, "4", 36);
  pushSub("mm-sub-3", "3", "Replace transmission fluid and transfer fluid (Maintenance Minder sub 3)", transMonths, 30000);

  const diffFirst = footnoteMiles(text, "4") ?? 7500;
  pushSub(
    "mm-sub-6",
    "6",
    "Replace rear differential fluid (Maintenance Minder sub 6)",
    24,
    15000,
    `footnote *4 severe first ${diffFirst} mi`,
  );

  const brakeMonths = footnoteMonths(text, "5", 36);
  pushSub("mm-sub-7", "7", "Replace brake fluid (Maintenance Minder sub 7)", brakeMonths, null, "footnote *5");

  return rows;
};

export const estimateMmPageHint = (text: string, numpages: number): number => {
  if (/\b527\b/.test(text)) return 527;
  if (/Maintenance Minder/i.test(text)) return Math.min(4, numpages);
  return 1;
};
