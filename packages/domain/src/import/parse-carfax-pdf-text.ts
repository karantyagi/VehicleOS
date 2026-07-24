import type { VehicleOsImportService } from "./record-vehicleos-import.js";

export type ParseCarfaxPdfTextResult = {
  services: VehicleOsImportService[];
  maxMileage: number;
  warnings: string[];
};

const UI_NOISE =
  /^(back to top|edit record|upload receipts?|view receipt|add note|rate service|leave a review|dashboard|garage|service history|maintenance schedule|repair costs|something wrong|products|resources|about us|contact us|\+ add a service record|\(\/service\/|\d+\/\d+$|https?:\/\/|-- \d+ of \d+ --|\d+\/\d+\/\d+,)/i;

const SHOP_URL_SUFFIX = /\s*\(https?:\/\/[^)]+\)\s*$/;

const RMV_ONLY_SHOPS = new Set(["massachusetts motor vehicle dept."]);

const isUiNoise = (line: string): boolean =>
  UI_NOISE.test(line) ||
  line.includes("carfax.com") ||
  line.startsWith("(") ||
  line.length < 2;

const normalizeShop = (line: string): string =>
  line.replace(SHOP_URL_SUFFIX, "").replace(/\s+/g, " ").trim();

const parseUsDate = (raw: string): string | null => {
  const match = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const parseMileage = (raw: string): number => {
  const digits = raw.replace(/[^\d]/g, "");
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) ? value : 0;
};

const isBlockTerminator = (line: string): boolean =>
  line === "Date" || line === "Services Performed" || isUiNoise(line);

const inferShopFromLine = (line: string): string | null => {
  if (isUiNoise(line)) return null;
  const normalized = normalizeShop(line);
  if (!normalized || normalized === "Date" || normalized === "Odometer") return null;
  return normalized;
};

const dedupeServices = (services: VehicleOsImportService[]): VehicleOsImportService[] => {
  const map = new Map<string, VehicleOsImportService>();
  for (const service of services) {
    const key = `${service.serviceDate}|${service.shop}|${service.mileage}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, service);
      continue;
    }
    const mergedItems = [...new Set([...existing.lineItems, ...service.lineItems])];
    map.set(key, { ...existing, lineItems: mergedItems });
  }
  return [...map.values()];
};

export const parseCarfaxPdfText = (rawText: string): ParseCarfaxPdfTextResult => {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim());
  const services: VehicleOsImportService[] = [];
  const warnings: string[] = [];
  let pendingShop: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) continue;

    const shopCandidate = inferShopFromLine(line);
    if (shopCandidate && lines[index + 1] === "Date") {
      pendingShop = shopCandidate;
    }

    if (line !== "Date") continue;

    const dateRaw = lines[index + 1];
    const serviceDate = dateRaw ? parseUsDate(dateRaw) : null;
    if (!serviceDate) continue;

    let mileage = 0;
    let servicesStart = index + 2;
    if (lines[index + 2] === "Odometer") {
      mileage = lines[index + 3] ? parseMileage(lines[index + 3]) : 0;
      servicesStart = index + 4;
    }

    if (lines[servicesStart] !== "Services Performed") continue;

    const shop = pendingShop ?? "Unknown shop";
    if (RMV_ONLY_SHOPS.has(shop.toLowerCase())) {
      continue;
    }

    const lineItems: string[] = [];
    for (let itemIndex = servicesStart + 1; itemIndex < lines.length; itemIndex += 1) {
      const itemLine = lines[itemIndex];
      if (!itemLine || isBlockTerminator(itemLine)) break;
      if (isUiNoise(itemLine)) continue;
      lineItems.push(itemLine);
    }

    if (lineItems.length === 0) {
      warnings.push(`Skipped ${shop} on ${serviceDate} — no service line items.`);
      continue;
    }

    if (mileage === 0) {
      warnings.push(`Missing odometer for ${shop} on ${serviceDate} — stored as 0 mi.`);
    }

    services.push({
      shop,
      serviceDate,
      mileage,
      lineItems,
      total: "$0.00",
    });
  }

  const deduped = dedupeServices(services);
  const maxMileage = deduped.reduce((max, service) => Math.max(max, service.mileage), 0);

  return { services: deduped, maxMileage, warnings };
};
