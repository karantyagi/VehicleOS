import type { ExtractedScheduleRow } from "./types.js";
import type { OemSchedulePack } from "../../types.js";
import { parsePdfFile } from "../extract-pdf-text.js";
import { estimateMmPageHint, extractMaintenanceMinderRows } from "./extract-honda-mm.js";
import { findTireRotationInterval } from "./interval-parse.js";

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
    const normalized = text.replace(/\s+/g, " ");
    const tire = findTireRotationInterval(normalized);
    const services = [
      { rowKey: "engine-oil", label: "engine oil", defaultMiles: 10000 },
      { rowKey: "tire-rotation", label: "tire rotation", defaultMiles: tire.miles ?? 5000, defaultMonths: tire.months ?? 6 },
      { rowKey: "brake-fluid", label: "brake fluid", defaultMiles: null },
    ];

    for (const service of services) {
      if (service.rowKey === "tire-rotation") {
        rows.push({
          rowKey: service.rowKey,
          serviceName: service.label,
          intervalMiles: service.defaultMiles,
          intervalMonths: service.defaultMonths ?? 6,
          sourcePage: pageMarker(1, service.label),
        });
        continue;
      }

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
    const normalized = text.replace(/\s+/g, " ");
    const tire = findTireRotationInterval(normalized);
    rows.push(
      {
        rowKey: "tire-rotation",
        serviceName: "Rotate tires",
        intervalMiles: tire.miles ?? 7500,
        intervalMonths: tire.months ?? 6,
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
