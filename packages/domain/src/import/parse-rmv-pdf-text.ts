import type { VehicleOsRmvRecord } from "./record-vehicleos-rmv-import.js";

export type ParseRmvPdfTextResult = {
  records: VehicleOsRmvRecord[];
  warnings: string[];
};

const UI_NOISE =
  /^(back to top|edit record|upload receipts?|view receipt|add note|products|resources|about us|contact us|https?:\/\/|-- \d+ of \d+ --|\d+\/\d+\/\d+,)/i;

const parseUsDate = (raw: string): string | null => {
  const match = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const parseMileage = (raw: string): number | null => {
  const digits = raw.replace(/[^\d]/g, "");
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) ? value : null;
};

const classifyEventType = (
  details: string[],
): VehicleOsRmvRecord["eventType"] => {
  const blob = details.join(" ").toLowerCase();
  if (blob.includes("title")) return "title";
  if (blob.includes("registration")) return "registration";
  if (blob.includes("lien") || blob.includes("loan")) return "lien";
  if (blob.includes("inspection") || blob.includes("emissions")) return "inspection";
  return "other";
};

const isUiNoise = (line: string): boolean => UI_NOISE.test(line) || line.includes("carfax.com");

const dedupeRecords = (records: VehicleOsRmvRecord[]): VehicleOsRmvRecord[] => {
  const map = new Map<string, VehicleOsRmvRecord>();
  for (const record of records) {
    const key = `${record.recordDate}|${record.agency}|${record.eventType}|${record.description}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, record);
      continue;
    }
    map.set(key, {
      ...existing,
      details: [...new Set([...existing.details, ...record.details])],
    });
  }
  return [...map.values()];
};

export const parseRmvPdfText = (rawText: string): ParseRmvPdfTextResult => {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim());
  const records: VehicleOsRmvRecord[] = [];
  const warnings: string[] = [];
  let pendingAgency: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line || isUiNoise(line)) continue;

    if (
      line.toLowerCase().includes("motor vehicle") ||
      line.toLowerCase() === "massachusetts" ||
      line.toLowerCase().includes("rmv") ||
      line.toLowerCase().includes("registry of motor vehicles")
    ) {
      pendingAgency = line.replace(/\s*\(https?:\/\/[^)]+\)\s*$/, "").trim();
    }

    if (line !== "Date") continue;

    const dateRaw = lines[index + 1];
    const recordDate = dateRaw && !dateRaw.startsWith("Odometer") ? parseUsDate(dateRaw) : null;

    let mileage: number | null = null;
    let detailsStart = index + 2;
    if (lines[index + 1] === "Odometer") {
      mileage = lines[index + 2] ? parseMileage(lines[index + 2]) : null;
      detailsStart = index + 3;
    } else if (lines[index + 2] === "Odometer") {
      mileage = lines[index + 3] ? parseMileage(lines[index + 3]) : null;
      detailsStart = index + 4;
    }

    if (lines[detailsStart] !== "Services Performed") continue;

    const details: string[] = [];
    for (let itemIndex = detailsStart + 1; itemIndex < lines.length; itemIndex += 1) {
      const itemLine = lines[itemIndex];
      if (!itemLine || itemLine === "Date" || itemLine === "Services Performed") break;
      if (isUiNoise(itemLine)) continue;
      details.push(itemLine);
    }

    if (details.length === 0) continue;

    const blob = details.join(" ").toLowerCase();
    const isOwnershipEvent =
      blob.includes("title") ||
      blob.includes("registration") ||
      blob.includes("lien") ||
      blob.includes("loan") ||
      blob.includes("color noted") ||
      blob.includes("first owner");

    if (!isOwnershipEvent) continue;

    const agency = pendingAgency ?? "RMV / DMV";
    const eventType = classifyEventType(details);
    const description = details[0] ?? "Vehicle record event";

    records.push({
      agency,
      recordDate: recordDate ?? "1970-01-01",
      mileage,
      eventType,
      description,
      details,
    });

    if (!recordDate) {
      warnings.push(`RMV row missing date for ${description} — placeholder date used.`);
    }
  }

  return { records: dedupeRecords(records), warnings };
};
