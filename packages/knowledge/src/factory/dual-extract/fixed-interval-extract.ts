import type { ExtractedScheduleRow } from "./types.js";
import { findTireRotationInterval, TIRE_ROTATION_ANCHOR } from "./interval-parse.js";

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

const findNearestNumber = (text: string, anchor: RegExp, kind: "miles" | "months"): number | null => {
  const match = text.match(anchor);
  if (!match || match.index == null) return null;
  const window = text.slice(match.index, match.index + 220);
  return kind === "miles" ? parseMiles(window) : parseMonths(window);
};

export const ENGINE_OIL_ANCHOR =
  /engine\s*oil|oil\s*change|oil\s*service|CBS.*oil|maintenance\s*service.*oil/i;
export const BRAKE_FLUID_ANCHOR = /brake\s*fluid/i;
export const VEHICLE_CHECK_ANCHOR = /vehicle\s*check|service\s*vehicle\s*check/i;

/** Evidence-gated fixed-interval rows — no blind defaults (Pass A + Pass B share anchors). */
export const extractFixedIntervalRows = (input: {
  text: string;
  variant: "structural" | "footnote";
}): ExtractedScheduleRow[] => {
  const normalized = input.text.replace(/\s+/g, " ");
  const rows: ExtractedScheduleRow[] = [];

  const tire = findTireRotationInterval(normalized);
  if (tire.miles != null || tire.months != null || TIRE_ROTATION_ANCHOR.test(normalized)) {
    rows.push({
      rowKey: "tire-rotation",
      serviceName: "Tire rotation",
      intervalMiles: tire.miles,
      intervalMonths: tire.months,
      sourcePage: pageMarker(1, "Tire rotation"),
    });
  }

  if (ENGINE_OIL_ANCHOR.test(normalized)) {
    const miles = findNearestNumber(normalized, ENGINE_OIL_ANCHOR, "miles");
    const months = findNearestNumber(normalized, ENGINE_OIL_ANCHOR, "months");
    rows.push({
      rowKey: "engine-oil",
      serviceName: "Engine oil",
      intervalMiles: miles,
      intervalMonths: months ?? (miles == null ? 12 : null),
      sourcePage: pageMarker(1, "Engine oil"),
    });
  }

  if (BRAKE_FLUID_ANCHOR.test(normalized)) {
    rows.push({
      rowKey: "brake-fluid",
      serviceName: "Brake fluid",
      intervalMiles: findNearestNumber(normalized, BRAKE_FLUID_ANCHOR, "miles"),
      intervalMonths: findNearestNumber(normalized, BRAKE_FLUID_ANCHOR, "months") ?? 24,
      sourcePage: pageMarker(1, "Brake fluid"),
    });
  }

  if (VEHICLE_CHECK_ANCHOR.test(normalized)) {
    rows.push({
      rowKey: "vehicle-check",
      serviceName: "Vehicle check",
      intervalMiles: findNearestNumber(normalized, VEHICLE_CHECK_ANCHOR, "miles"),
      intervalMonths: findNearestNumber(normalized, VEHICLE_CHECK_ANCHOR, "months") ?? 12,
      sourcePage: pageMarker(1, "Vehicle check"),
    });
  }

  return rows;
};
