import type { VehicleRecordEventType } from "../events/catalog.js";

export type DerivedOwnershipRecord = {
  agency: string;
  recordDate: string;
  mileage: number | null;
  eventType: VehicleRecordEventType;
  description: string;
  details: string[];
};

type RmvLineRule = {
  lineItemPattern: RegExp;
  eventType: VehicleRecordEventType;
  description: string;
  renewalMonths: number;
  agency?: string;
};

const DEFAULT_AGENCY = "Massachusetts RMV";

const RMV_LINE_RULES: RmvLineRule[] = [
  {
    lineItemPattern: /passed safety inspection|inspection sticker renewed|inspection passed/i,
    eventType: "inspection",
    description: "Safety inspection — owner noted",
    renewalMonths: 12,
  },
  {
    lineItemPattern: /passed emissions inspection|emissions passed/i,
    eventType: "inspection",
    description: "Emissions inspection — owner noted",
    renewalMonths: 12,
  },
  {
    lineItemPattern: /registration renewed/i,
    eventType: "registration",
    description: "Registration renewal — owner noted",
    renewalMonths: 12,
  },
];

const parseIsoDate = (value: string): Date => new Date(`${value}T12:00:00.000Z`);

const formatIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

const addMonths = (date: string, months: number): string => {
  const next = parseIsoDate(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return formatIsoDate(next);
};

export const deriveOwnershipRecordsFromLineItems = (input: {
  lineItems: string[];
  recordDate: string;
  mileage: number | null;
  agency?: string;
}): DerivedOwnershipRecord[] => {
  const agency = input.agency?.trim() || DEFAULT_AGENCY;
  const records: DerivedOwnershipRecord[] = [];

  for (const lineItem of input.lineItems) {
    const rule = RMV_LINE_RULES.find((candidate) => candidate.lineItemPattern.test(lineItem));
    if (!rule) continue;

    const expirationDate = addMonths(input.recordDate, rule.renewalMonths);

    records.push({
      agency,
      recordDate: input.recordDate,
      mileage: input.mileage,
      eventType: rule.eventType,
      description: rule.description,
      details: [
        `Line item: ${lineItem}`,
        `Expiration date: ${expirationDate}`,
        "Projected renewal — import RMV PDF for exact expiration",
      ],
    });
  }

  return records;
};
