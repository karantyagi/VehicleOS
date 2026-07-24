import type { MyRmvMaVehiclePageExtractV1 } from "./extract-types.js";

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

export const isMyRmvPortalLayout = (text: string): boolean =>
  /myRMV|Title Information|Registration Information|atlas-myrmv/i.test(text);

const parseVehicleYearMakeModel = (
  raw: string | null,
): Pick<MyRmvMaVehiclePageExtractV1["vehicle"], "yearMakeModel" | "year" | "make" | "model"> => {
  if (!raw) {
    return { yearMakeModel: null, year: null, make: null, model: null };
  }
  const match = raw.match(/^(\d{4})\s+(\w+)\s+(.+)$/i);
  if (!match) return { yearMakeModel: raw, year: null, make: null, model: null };
  const [, yearToken, makeToken, modelToken] = match;
  const make = makeToken.toUpperCase() === "ACUR" ? "Acura" : makeToken;
  return {
    yearMakeModel: raw,
    year: Number.parseInt(yearToken, 10),
    make,
    model: modelToken.trim(),
  };
};

export type ExtractMyRmvMaVehiclePageInput = {
  rawText: string;
  source?: string;
  extractedAt?: string;
};

export const extractMyRmvMaVehiclePageFromPdfText = (
  input: ExtractMyRmvMaVehiclePageInput,
): MyRmvMaVehiclePageExtractV1 | null => {
  if (!isMyRmvPortalLayout(input.rawText)) return null;

  const text = collapseWhitespace(input.rawText);
  const warnings: string[] = [];

  const dateOfBirthRaw = text.match(/Date of Birth:\s*([A-Za-z]{3}-\d{2}-\d{4})/i)?.[1];
  const licenseIssuedRaw = text.match(/Issued:\s*([A-Za-z]{3}-\d{2}-\d{4})/i)?.[1];
  const licenseExpiresRaw = text.match(/Expires:\s*([A-Za-z]{3}-\d{2}-\d{4})/i)?.[1];
  const passengerStatus = text.match(/Passenger:\s*(\w+)/i)?.[1] ?? null;
  const commercialStatus = text.match(/Commercial:\s*(\w+)/i)?.[1] ?? null;

  const restrictions: string[] = [];
  const restrictionsMatch = text.match(/Restrictions\s+(.+?)(?=202\d|\sClass D|$)/i);
  if (restrictionsMatch?.[1]) {
    restrictions.push(restrictionsMatch[1].trim());
  }

  const yearMakeModelRaw = text.match(/(\d{4}\s+[A-Z]+\s+[A-Z0-9]+)/i)?.[1] ?? null;
  const vehicleFields = parseVehicleYearMakeModel(yearMakeModelRaw);
  const vin = text.match(/VIN:\s*([A-HJ-NPR-Z0-9]{11,17})/i)?.[1] ?? null;

  const titleNumber = text.match(/Title Number:\s*([A-Z0-9]+)/i)?.[1] ?? null;
  const titleDate = parseMyRmvMonthDate(text.match(/Title Date:\s*([A-Za-z]{3}-\d{2}-\d{4})/i)?.[1]);
  const titleStatus = text.match(/Title Status:\s*(\w+)/i)?.[1] ?? null;

  const typeNumber = text.match(/Type\/Number:\s*(.+?)\s+(?:There are|Effective Date:)/i)?.[1]?.trim() ?? null;
  const plate = text.match(/Plate\/([A-Z0-9]+)/i)?.[1] ?? null;
  const effectiveDate = parseMyRmvMonthDate(text.match(/Effective Date:\s*([A-Za-z]{3}-\d{2}-\d{4})/i)?.[1]);
  const expirationDate = parseMyRmvMonthDate(text.match(/Expiration Date:\s*([A-Za-z]{3}-\d{2}-\d{4})/i)?.[1]);
  const registrationStatus = text.match(/Status:\s*(Active|Expired|Suspended)/i)?.[1] ?? null;
  const alreadyRenewed = /Already Renewed/i.test(text);

  if (!titleNumber && !effectiveDate && !vin) return null;

  if (titleNumber && !titleDate) {
    warnings.push("Title number found but title date missing.");
  }
  if (!effectiveDate && text.includes("Registration Information")) {
    warnings.push("Registration block found but effective date missing.");
  }

  return {
    version: "1",
    portal: "myrmv-ma",
    source: input.source ?? "myrmv-pdf-extract",
    extractedAt: input.extractedAt ?? new Date().toISOString(),
    owner: {
      dateOfBirth: parseMyRmvMonthDate(dateOfBirthRaw),
      licenseClass: /Class D License/i.test(text) ? "D" : null,
      licenseIssued: parseMyRmvMonthDate(licenseIssuedRaw),
      licenseExpires: parseMyRmvMonthDate(licenseExpiresRaw),
      passengerStatus,
      commercialStatus,
      restrictions,
    },
    vehicle: {
      ...vehicleFields,
      vin,
    },
    registration: {
      typeNumber,
      plate,
      effectiveDate,
      expirationDate,
      status: registrationStatus,
      alreadyRenewed,
    },
    title: {
      titleNumber,
      titleDate,
      titleStatus,
    },
    warnings,
  };
};

export const extractMyRmvVin = (rawText: string): string | null =>
  collapseWhitespace(rawText).match(/VIN:\s*([A-HJ-NPR-Z0-9]{11,17})/i)?.[1] ?? null;
