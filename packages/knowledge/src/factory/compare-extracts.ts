import type { ExtractedScheduleRow, ExtractMismatch } from "./dual-extract/types.js";

const rowMap = (rows: ExtractedScheduleRow[]): Map<string, ExtractedScheduleRow> =>
  new Map(rows.map((row) => [row.rowKey, row]));

const milesEqual = (a: number | null, b: number | null): boolean => {
  if (a == null && b == null) return true;
  if (a == null || b == null) return true;
  return Math.abs(a - b) <= 500;
};

const monthsEqual = (a: number | null, b: number | null): boolean => {
  if (a == null && b == null) return true;
  if (a == null || b == null) return true;
  return a === b;
};

export const compareDualExtracts = (input: {
  passA: ExtractedScheduleRow[];
  passB: ExtractedScheduleRow[];
}): ExtractMismatch[] => {
  const mapA = rowMap(input.passA);
  const mapB = rowMap(input.passB);
  const keys = new Set([...mapA.keys(), ...mapB.keys()]);
  const mismatches: ExtractMismatch[] = [];

  for (const key of keys) {
    const a = mapA.get(key);
    const b = mapB.get(key);

    if (!a && b) {
      mismatches.push({ rowKey: key, issue: "Pass B found row; Pass A missing", passB: b });
      continue;
    }
    if (a && !b) {
      mismatches.push({ rowKey: key, issue: "Pass A found row; Pass B missing", passA: a });
      continue;
    }
    if (!a || !b) continue;

    if (!milesEqual(a.intervalMiles, b.intervalMiles)) {
      mismatches.push({
        rowKey: key,
        issue: `dual-extract mismatch (${a.intervalMiles ?? "null"} vs ${b.intervalMiles ?? "null"} mi)`,
        passA: a,
        passB: b,
      });
      continue;
    }

    if (!monthsEqual(a.intervalMonths, b.intervalMonths)) {
      mismatches.push({
        rowKey: key,
        issue: `dual-extract months mismatch (${a.intervalMonths ?? "null"} vs ${b.intervalMonths ?? "null"} mo)`,
        passA: a,
        passB: b,
      });
    }
  }

  return mismatches;
};

export const dualExtractAgrees = (mismatches: ExtractMismatch[]): boolean => mismatches.length === 0;
