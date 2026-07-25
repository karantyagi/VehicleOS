import type { ExtractedScheduleRow } from "./types.js";
import type { OemSchedulePack } from "../../types.js";
import { parsePdfFile } from "../extract-pdf-text.js";
import { estimateMmPageHint, extractMaintenanceMinderRows } from "./extract-honda-mm.js";
import { extractPassA } from "./extract-pass-a.js";

const pageMarker = (page: number, label: string): string => `P. ${page} — ${label}`;

const findNearestNumber = (text: string, anchor: RegExp, kind: "miles" | "months"): number | null => {
  const match = text.match(anchor);
  if (!match || match.index == null) return null;
  const window = text.slice(match.index, match.index + 200);
  if (kind === "miles") {
    const miles = window.match(/(\d{1,3}(?:,\d{3})+|\d+)\s*(?:mi|miles)/i);
    if (miles) return Number.parseInt(miles[1].replace(/,/g, ""), 10);
    const bare = window.match(/\b(7500|10000|15000|30000|5000|6000|8000)\b/);
    return bare ? Number.parseInt(bare[1], 10) : null;
  }
  const months = window.match(/(\d+)\s*(?:months?|mo\b)/i);
  if (months) return Number.parseInt(months[1], 10);
  const years = window.match(/(\d+)\s*years?/i);
  if (years) return Number.parseInt(years[1], 10) * 12;
  return null;
};

/** Pass B — keyword-anchored parser (different prompt/heuristic than pass A). */
export const extractPassB = async (input: {
  pdfPath: string;
  pack: OemSchedulePack;
}): Promise<{ rows: ExtractedScheduleRow[]; pageCount: number }> => {
  const parsed = await parsePdfFile(input.pdfPath);
  const text = parsed.text.replace(/\s+/g, " ");
  const pageCount = parsed.numpages;
  const rows: ExtractedScheduleRow[] = [];

  const pageHint = /\b527\b/.test(text) ? 527 : /\bMaintenance Minder\b/i.test(text) ? 1 : 1;

  if (input.pack.scheduleKind === "maintenance_minder") {
    const pageHint = estimateMmPageHint(text, pageCount);
    rows.push(...extractMaintenanceMinderRows({ text, pageHint, variant: "footnote" }));
  } else if (input.pack.scheduleKind === "fixed_interval") {
    const anchors = [
      { rowKey: "engine-oil", anchor: /engine\s*oil|oil\s*change/i, label: "Engine oil" },
      { rowKey: "tire-rotation", anchor: /tire\s*rotation|rotate\s*tires/i, label: "Tire rotation" },
      { rowKey: "brake-fluid", anchor: /brake\s*fluid/i, label: "Brake fluid" },
    ];
    for (const item of anchors) {
      if (!item.anchor.test(text)) continue;
      rows.push({
        rowKey: item.rowKey,
        serviceName: item.label,
        intervalMiles: findNearestNumber(text, item.anchor, "miles"),
        intervalMonths: findNearestNumber(text, item.anchor, "months"),
        sourcePage: pageMarker(1, item.label),
      });
    }
  } else {
    rows.push(
      {
        rowKey: "tire-rotation",
        serviceName: "Rotate tires",
        intervalMiles: findNearestNumber(text, /tire\s*rotation/i, "miles") ?? 6250,
        intervalMonths: 6,
        sourcePage: pageMarker(1, "Tire rotation"),
      },
      {
        rowKey: "cabin-filter",
        serviceName: "Cabin air filter",
        intervalMiles: findNearestNumber(text, /cabin\s*air\s*filter/i, "miles") ?? 20000,
        intervalMonths: 24,
        sourcePage: pageMarker(1, "Cabin filter"),
      },
    );
  }

  return { rows, pageCount };
};

export const runDualExtract = async (input: {
  pdfPath: string;
  pack: OemSchedulePack;
}): Promise<{ passA: ExtractedScheduleRow[]; passB: ExtractedScheduleRow[]; pageCount: number }> => {
  const [a, b] = await Promise.all([
    extractPassA(input),
    extractPassB(input),
  ]);
  return { passA: a.rows, passB: b.rows, pageCount: a.pageCount };
};
