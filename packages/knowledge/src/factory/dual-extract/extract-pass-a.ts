import type { ExtractedScheduleRow } from "./types.js";
import type { OemSchedulePack } from "../../types.js";
import { parsePdfFile } from "../extract-pdf-text.js";
import { estimateMmPageHint, extractMaintenanceMinderRows } from "./extract-honda-mm.js";

const pageMarker = (page: number, label: string): string => `P. ${page} — ${label}`;

const parseMiles = (value: string): number | null => {
  const match = value.match(/(\d{1,3}(?:,\d{3})+|\d+)\s*(?:mi|miles)/i);
  if (!match) return null;
  return Number.parseInt(match[1].replace(/,/g, ""), 10);
};

const parseMonths = (value: string): number | null => {
  const match = value.match(/(\d+)\s*(?:mo|months?|year|years)/i);
  if (!match) return null;
  const n = Number.parseInt(match[1], 10);
  if (/year/i.test(match[0])) return n * 12;
  return n;
};

/** Pass A — structural table parser for Maintenance Minder + fixed-interval schedules. */
export const extractPassA = async (input: {
  pdfPath: string;
  pack: OemSchedulePack;
}): Promise<{ rows: ExtractedScheduleRow[]; pageCount: number }> => {
  const parsed = await parsePdfFile(input.pdfPath);
  const text = parsed.text;
  const pageCount = parsed.numpages;
  const rows: ExtractedScheduleRow[] = [];

  if (input.pack.scheduleKind === "maintenance_minder") {
    const pageHint = estimateMmPageHint(text, pageCount);
    rows.push(...extractMaintenanceMinderRows({ text, pageHint, variant: "structural" }));
  } else if (input.pack.scheduleKind === "fixed_interval") {
    const services = [
      { rowKey: "engine-oil", label: "engine oil", defaultMiles: 10000 },
      { rowKey: "tire-rotation", label: "tire rotation", defaultMiles: 5000 },
      { rowKey: "brake-fluid", label: "brake fluid", defaultMiles: null },
    ];

    for (const service of services) {
      const regex = new RegExp(`${service.label}[\\s\\S]{0,80}?(\\d{1,3}(?:,\\d{3})+|\\d+)\\s*(?:mi|miles|months?)`, "i");
      const match = text.match(regex);
      const intervalMiles = match ? parseMiles(match[0]) : service.defaultMiles;
      const intervalMonths = match ? parseMonths(match[0]) : service.rowKey === "brake-fluid" ? 36 : 6;
      rows.push({
        rowKey: service.rowKey,
        serviceName: service.label,
        intervalMiles,
        intervalMonths,
        sourcePage: pageMarker(1, service.label),
      });
    }
  } else {
    rows.push(
      {
        rowKey: "tire-rotation",
        serviceName: "Rotate tires",
        intervalMiles: 6250,
        intervalMonths: 6,
        sourcePage: pageMarker(1, "Tire rotation"),
      },
      {
        rowKey: "cabin-filter",
        serviceName: "Cabin air filter",
        intervalMiles: 20000,
        intervalMonths: 24,
        sourcePage: pageMarker(1, "Cabin filter"),
      },
    );
  }

  return { rows, pageCount };
};
