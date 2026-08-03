import type { ServiceRecordSource } from "../events/catalog.js";

/** A confirmed service, or a source-confirmed visit whose work is unknown. */
export type ServiceRecordKind = "service" | "visit_only";

type ServiceRecordShape = {
  source?: ServiceRecordSource;
  lineItems: string[];
  recordKind?: ServiceRecordKind;
};

const normalizedLineItem = (lineItem: string): string =>
  lineItem.trim().toLowerCase().replace(/\s+/g, " ");

export const isGenericCarfaxVisitLineItem = (lineItem: string): boolean =>
  normalizedLineItem(lineItem) === "service visit";

/**
 * CARFAX sometimes adds a generic "Service visit" beside the real work.
 * Keep it only when it is the sole available description.
 */
export const stripGenericCarfaxVisitLineItems = (lineItems: string[]): string[] => {
  const meaningful = lineItems.filter((lineItem) => !isGenericCarfaxVisitLineItem(lineItem));
  return meaningful.length > 0 ? meaningful : lineItems;
};

export const resolveServiceRecordKind = (input: ServiceRecordShape): ServiceRecordKind => {
  const nonEmptyLineItems = input.lineItems.filter((lineItem) => lineItem.trim().length > 0);
  return input.source === "carfax_import" &&
    nonEmptyLineItems.length > 0 &&
    nonEmptyLineItems.every(isGenericCarfaxVisitLineItem)
    ? "visit_only"
    : "service";
};

export const isVisitOnlyServiceRecord = (input: ServiceRecordShape): boolean =>
  resolveServiceRecordKind(input) === "visit_only";

/** Records that can establish maintenance timing or complete first-service onboarding. */
export const maintenanceServiceHistory = <T extends ServiceRecordShape>(entries: T[]): T[] =>
  entries.filter((entry) => !isVisitOnlyServiceRecord(entry));
