import { EVENT_TYPES, EVENT_VERSIONS, type CatalogDomainEvent } from "../events/catalog.js";
import type { EventStore } from "../ports/event-store.js";
import type { OwnershipRecordEntry } from "../projections/types.js";
import type { VehicleOsRmvRecord } from "../import/record-vehicleos-rmv-import.js";
import { normalizeDedupeText } from "../import/dedupe-import-rows.js";

export type OwnerDriverLicense = {
  recordId: string;
  agency: string;
  recordDate: string;
  licenseClass: string | null;
  expirationDate: string;
  description: string;
  details: string[];
  source: "rmv_import" | "owner_note";
};

export type OwnerDriverLicenseDraft = Omit<OwnerDriverLicense, "recordId"> & {
  recordId?: string;
};

const detailValue = (details: string[], label: string): string | null => {
  const detail = details.find((line) => line.toLowerCase().startsWith(`${label.toLowerCase()}:`));
  return detail ? detail.slice(detail.indexOf(":") + 1).trim() || null : null;
};

export const ownerDriverLicenseFromRmvRecord = (record: VehicleOsRmvRecord): OwnerDriverLicense | null => {
  if (record.eventType !== "license") return null;

  const expirationDate = detailValue(record.details, "Expiration Date");
  if (!expirationDate) return null;

  return {
    recordId: "",
    agency: record.agency,
    recordDate: record.recordDate,
    licenseClass: detailValue(record.details, "License class"),
    expirationDate,
    description: record.description,
    details: record.details,
    source: "rmv_import",
  };
};

export const ownerDriverLicenseFingerprint = (license: Pick<OwnerDriverLicense, "agency" | "licenseClass" | "expirationDate">): string =>
  `${normalizeDedupeText(license.agency)}|${normalizeDedupeText(license.licenseClass ?? "")}|${license.expirationDate}`;

export const projectOwnerDriverLicenses = (events: CatalogDomainEvent[]): OwnerDriverLicense[] => {
  const unique = new Map<string, OwnerDriverLicense>();

  for (const event of events) {
    if (event.eventType !== EVENT_TYPES.OWNER_DRIVER_LICENSE_RECORDED) continue;
    const license: OwnerDriverLicense = {
      recordId: event.payload.recordId,
      agency: event.payload.agency,
      recordDate: event.payload.recordDate,
      licenseClass: event.payload.licenseClass,
      expirationDate: event.payload.expirationDate,
      description: event.payload.description,
      details: event.payload.details,
      source: event.payload.source,
    };
    unique.set(ownerDriverLicenseFingerprint(license), license);
  }

  // A renewal replaces the prior credential in owner-facing views; events retain its audit history.
  return [...unique.values()]
    .sort((left, right) => right.expirationDate.localeCompare(left.expirationDate))
    .slice(0, 1);
};

export const ownerDriverLicenseToOwnershipRecord = (license: OwnerDriverLicense): OwnershipRecordEntry => ({
  recordId: license.recordId,
  agency: license.agency,
  recordDate: license.recordDate,
  mileage: null,
  eventType: "license",
  description: license.description,
  details: license.details,
  source: license.source,
});

/** Record one owner-entered credential deadline without attaching it to a vehicle. */
export const recordOwnerDriverLicense = async (deps: {
  eventStore: EventStore;
  ownerId: string;
  license: OwnerDriverLicenseDraft;
}): Promise<OwnerDriverLicense[]> => {
  const existingEvents = await deps.eventStore.loadByAggregate("owner", deps.ownerId);
  const current = projectOwnerDriverLicenses(existingEvents)[0];
  if (
    current
    && current.agency === deps.license.agency
    && current.licenseClass === deps.license.licenseClass
    && current.expirationDate === deps.license.expirationDate
    && current.description === deps.license.description
  ) {
    return [current];
  }

  await deps.eventStore.append({
    aggregateType: "owner",
    aggregateId: deps.ownerId,
    eventType: EVENT_TYPES.OWNER_DRIVER_LICENSE_RECORDED,
    eventVersion: EVENT_VERSIONS[EVENT_TYPES.OWNER_DRIVER_LICENSE_RECORDED],
    payload: {
      ownerId: deps.ownerId,
      recordId: deps.license.recordId ?? current?.recordId ?? crypto.randomUUID(),
      agency: deps.license.agency,
      recordDate: deps.license.recordDate,
      licenseClass: deps.license.licenseClass,
      expirationDate: deps.license.expirationDate,
      description: deps.license.description,
      details: deps.license.details,
      source: deps.license.source,
    },
    correlationId: crypto.randomUUID(),
  });

  return projectOwnerDriverLicenses(
    await deps.eventStore.loadByAggregate("owner", deps.ownerId),
  );
};

export const recordOwnerDriverLicenses = async (deps: {
  eventStore: EventStore;
  ownerId: string;
  records: VehicleOsRmvRecord[];
}): Promise<{ importedCount: number; skippedCount: number }> => {
  const incoming = deps.records
    .map(ownerDriverLicenseFromRmvRecord)
    .filter((license): license is OwnerDriverLicense => license !== null);
  if (incoming.length === 0) return { importedCount: 0, skippedCount: 0 };

  const existingEvents = await deps.eventStore.loadByAggregate("owner", deps.ownerId);
  const known = new Set(
    existingEvents
      .filter((event) => event.eventType === EVENT_TYPES.OWNER_DRIVER_LICENSE_RECORDED)
      .map((event) =>
        ownerDriverLicenseFingerprint({
          agency: event.payload.agency,
          licenseClass: event.payload.licenseClass,
          expirationDate: event.payload.expirationDate,
        }),
      ),
  );
  const correlationId = crypto.randomUUID();
  let importedCount = 0;
  let skippedCount = 0;

  for (const license of incoming) {
    const fingerprint = ownerDriverLicenseFingerprint(license);
    if (known.has(fingerprint)) {
      skippedCount += 1;
      continue;
    }
    known.add(fingerprint);
    importedCount += 1;
    await deps.eventStore.append({
      aggregateType: "owner",
      aggregateId: deps.ownerId,
      eventType: EVENT_TYPES.OWNER_DRIVER_LICENSE_RECORDED,
      eventVersion: EVENT_VERSIONS[EVENT_TYPES.OWNER_DRIVER_LICENSE_RECORDED],
      payload: {
        ownerId: deps.ownerId,
        recordId: crypto.randomUUID(),
        agency: license.agency,
        recordDate: license.recordDate,
        licenseClass: license.licenseClass,
        expirationDate: license.expirationDate,
        description: license.description,
        details: license.details,
        source: "rmv_import",
      },
      correlationId,
    });
  }

  return { importedCount, skippedCount };
};
