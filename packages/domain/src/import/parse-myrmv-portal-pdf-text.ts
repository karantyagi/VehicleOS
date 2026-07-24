import type { VehicleOsRmvRecord } from "./record-vehicleos-rmv-import.js";
import type { ParseRmvPdfTextResult } from "./parse-rmv-pdf-text.js";

const MONTH_TO_NUMBER: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

const parseMyRmvMonthDate = (raw: string | undefined): string | null => {
  if (!raw) return null;
  const match = raw.trim().match(/^([A-Za-z]{3})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const [, monthToken, day, year] = match;
  const month = MONTH_TO_NUMBER[monthToken.toLowerCase()];
  if (!month) return null;
  return `${year}-${month}-${day}`;
};

const collapseWhitespace = (text: string): string => text.replace(/\s+/g, " ").trim();

const isMyRmvPortalLayout = (text: string): boolean =>
  /myRMV|Title Information|Registration Information|atlas-myrmv/i.test(text);

export const parseMyRmvPortalPdfText = (rawText: string): ParseRmvPdfTextResult | null => {
  if (!isMyRmvPortalLayout(rawText)) return null;

  const text = collapseWhitespace(rawText);
  const records: VehicleOsRmvRecord[] = [];
  const warnings: string[] = [];

  const titleNumber = text.match(/Title Number:\s*([A-Z0-9]+)/i)?.[1];
  const titleDate = parseMyRmvMonthDate(text.match(/Title Date:\s*([A-Za-z]{3}-\d{2}-\d{4})/i)?.[1]);
  const titleStatus = text.match(/Title Status:\s*(\w+)/i)?.[1];

  if (titleDate && titleNumber) {
    records.push({
      agency: "Massachusetts RMV (myRMV)",
      recordDate: titleDate,
      mileage: null,
      eventType: "title",
      description: `Title ${titleStatus?.toLowerCase() ?? "record"} — ${titleNumber}`,
      details: [
        `Title Number: ${titleNumber}`,
        `Title Date: ${text.match(/Title Date:\s*([A-Za-z]{3}-\d{2}-\d{4})/i)?.[1] ?? titleDate}`,
        titleStatus ? `Title Status: ${titleStatus}` : "Title Status: unknown",
      ].filter(Boolean),
    });
  } else if (titleNumber || text.includes("Title Information")) {
    warnings.push("Title block found but title date or number incomplete — check PDF export.");
  }

  const effectiveDate = parseMyRmvMonthDate(text.match(/Effective Date:\s*([A-Za-z]{3}-\d{2}-\d{4})/i)?.[1]);
  const expirationRaw = text.match(/Expiration Date:\s*([A-Za-z]{3}-\d{2}-\d{4})/i)?.[1];
  const expirationDate = parseMyRmvMonthDate(expirationRaw);
  const registrationStatus = text.match(/Status:\s*(Active|Expired|Suspended)/i)?.[1];
  const plate = text.match(/Plate\/([A-Z0-9]+)/i)?.[1];
  const registrationType = text.match(/Type\/Number:\s*([^/]+(?:\/[^/]+)*)/i)?.[1]?.trim();

  if (effectiveDate) {
    const details = [
      registrationType ? `Type/Number: ${registrationType}` : null,
      plate ? `Plate: ${plate}` : null,
      `Effective Date: ${text.match(/Effective Date:\s*([A-Za-z]{3}-\d{2}-\d{4})/i)?.[1] ?? effectiveDate}`,
      expirationRaw ? `Expiration Date: ${expirationRaw}` : null,
      registrationStatus ? `Status: ${registrationStatus}` : null,
      /Already Renewed/i.test(text) ? "Already Renewed" : null,
    ].filter((line): line is string => Boolean(line));

    records.push({
      agency: "Massachusetts RMV (myRMV)",
      recordDate: effectiveDate,
      mileage: null,
      eventType: "registration",
      description: plate
        ? `Registration ${registrationStatus?.toLowerCase() ?? "record"} — plate ${plate}`
        : `Registration ${registrationStatus?.toLowerCase() ?? "record"}`,
      details,
    });
  } else if (text.includes("Registration Information")) {
    warnings.push("Registration block found but effective date missing — check PDF export.");
  }

  if (records.length === 0) return null;

  const vin = text.match(/VIN:\s*([A-HJ-NPR-Z0-9]{11,17})/i)?.[1];
  if (vin) {
    for (const record of records) {
      if (!record.details.some((line) => line.startsWith("VIN:"))) {
        record.details.push(`VIN: ${vin}`);
      }
    }
  }

  if (expirationDate) {
    const reg = records.find((record) => record.eventType === "registration");
    if (reg && !reg.details.some((line) => line.startsWith("Expiration Date:"))) {
      reg.details.push(`Expiration Date: ${expirationRaw}`);
    }
  }

  return { records, warnings };
};

export const extractMyRmvVin = (rawText: string): string | null =>
  collapseWhitespace(rawText).match(/VIN:\s*([A-HJ-NPR-Z0-9]{11,17})/i)?.[1] ?? null;
