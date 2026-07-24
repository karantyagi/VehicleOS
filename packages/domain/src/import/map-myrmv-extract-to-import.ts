import type { MyRmvMaVehiclePageExtractV1, VehicleImportDefaults } from "./extract-types.js";
import type { VehicleOsRmvRecord } from "./record-vehicleos-rmv-import.js";

export type VehicleOsRmvImportV1 = {
  version: "1";
  source: string;
  exportedAt: string;
  vehicle: Omit<VehicleImportDefaults, "currentMileage"> & { currentMileage?: number };
  records: VehicleOsRmvRecord[];
};

export type MapMyRmvExtractInput = {
  extract: MyRmvMaVehiclePageExtractV1;
  vehicleDefaults: VehicleImportDefaults;
  exportedAt?: string;
  importSource?: string;
};

/** Owner block is extracted for future owner-profile use — not written on RMV vehicle import. */
export const mapMyRmvExtractToImport = (input: MapMyRmvExtractInput): VehicleOsRmvImportV1 => {
  const { extract, vehicleDefaults } = input;
  const records: VehicleOsRmvRecord[] = [];
  const agency = "Massachusetts RMV (myRMV)";

  const vin = extract.vehicle.vin ?? vehicleDefaults.vin;

  if (extract.title.titleDate && extract.title.titleNumber) {
    records.push({
      agency,
      recordDate: extract.title.titleDate,
      mileage: null,
      eventType: "title",
      description: `Title ${extract.title.titleStatus?.toLowerCase() ?? "record"} — ${extract.title.titleNumber}`,
      details: [
        `Title Number: ${extract.title.titleNumber}`,
        `Title Date: ${extract.title.titleDate}`,
        extract.title.titleStatus ? `Title Status: ${extract.title.titleStatus}` : "Title Status: unknown",
        vin ? `VIN: ${vin}` : null,
        extract.vehicle.yearMakeModel ? `Vehicle: ${extract.vehicle.yearMakeModel}` : null,
      ].filter((line): line is string => Boolean(line)),
    });
  }

  if (extract.registration.effectiveDate) {
    records.push({
      agency,
      recordDate: extract.registration.effectiveDate,
      mileage: null,
      eventType: "registration",
      description: extract.registration.plate
        ? `Registration ${extract.registration.status?.toLowerCase() ?? "record"} — plate ${extract.registration.plate}`
        : `Registration ${extract.registration.status?.toLowerCase() ?? "record"}`,
      details: [
        extract.registration.typeNumber ? `Type/Number: ${extract.registration.typeNumber}` : null,
        extract.registration.plate ? `Plate: ${extract.registration.plate}` : null,
        `Effective Date: ${extract.registration.effectiveDate}`,
        extract.registration.expirationDate
          ? `Expiration Date: ${extract.registration.expirationDate}`
          : null,
        extract.registration.status ? `Status: ${extract.registration.status}` : null,
        extract.registration.alreadyRenewed ? "Already Renewed" : null,
        vin ? `VIN: ${vin}` : null,
      ].filter((line): line is string => Boolean(line)),
    });
  }

  return {
    version: "1",
    source: input.importSource ?? extract.source,
    exportedAt: input.exportedAt ?? extract.extractedAt,
    vehicle: {
      vin,
      year: extract.vehicle.year ?? vehicleDefaults.year,
      make: extract.vehicle.make ?? vehicleDefaults.make,
      model: extract.vehicle.model ?? vehicleDefaults.model,
      trim: vehicleDefaults.trim,
      currentMileage: vehicleDefaults.currentMileage,
    },
    records,
  };
};
