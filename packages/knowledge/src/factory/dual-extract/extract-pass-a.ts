import type { ExtractedScheduleRow } from "./types.js";
import type { OemSchedulePack } from "../../types.js";
import { parsePdfFile } from "../extract-pdf-text.js";
import { estimateMmPageHint, extractMaintenanceMinderRows } from "./extract-honda-mm.js";
import { findTireRotationInterval } from "./interval-parse.js";
import { extractFixedIntervalRows } from "./fixed-interval-extract.js";

const pageMarker = (page: number, label: string): string => `P. ${page} — ${label}`;

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
    rows.push(...extractFixedIntervalRows({ text, variant: "structural" }));
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
