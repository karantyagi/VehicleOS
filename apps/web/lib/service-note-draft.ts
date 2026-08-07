export type ServiceNoteDraft = {
  text: string;
  serviceDate: string;
  mileage: number;
};

const DRAFT_VERSION = 1;

export function serviceNoteDraftStorageKey(vehicleId: string) {
  return `vehicleos:service-note-draft:v${DRAFT_VERSION}:${vehicleId}`;
}

/**
 * Treat browser storage as an optional convenience, never as trusted service
 * data. A malformed or older value is simply ignored.
 */
export function parseServiceNoteDraft(raw: string | null): ServiceNoteDraft | null {
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<ServiceNoteDraft>;
    if (
      typeof value.text !== "string" ||
      !value.text.trim() ||
      typeof value.serviceDate !== "string" ||
      typeof value.mileage !== "number" ||
      !Number.isFinite(value.mileage)
    ) {
      return null;
    }

    return {
      text: value.text,
      serviceDate: value.serviceDate,
      mileage: value.mileage,
    };
  } catch {
    return null;
  }
}
