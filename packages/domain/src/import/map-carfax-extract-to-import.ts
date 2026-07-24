import type { CarfaxServiceHistoryExtractV1, VehicleImportDefaults } from "./extract-types.js";
import type { VehicleOsImportService } from "./record-vehicleos-import.js";

export type VehicleOsImportV1 = {
  version: "1";
  source: string;
  exportedAt: string;
  vehicle: VehicleImportDefaults;
  services: VehicleOsImportService[];
};

export type MapCarfaxExtractInput = {
  extract: CarfaxServiceHistoryExtractV1;
  vehicleDefaults: VehicleImportDefaults;
  exportedAt?: string;
  importSource?: string;
};

export const mapCarfaxExtractToImport = (input: MapCarfaxExtractInput): VehicleOsImportV1 => {
  const { extract, vehicleDefaults } = input;
  const currentMileage = Math.max(vehicleDefaults.currentMileage, extract.vehicleHint.maxMileage);

  return {
    version: "1",
    source: input.importSource ?? extract.source,
    exportedAt: input.exportedAt ?? extract.extractedAt,
    vehicle: {
      ...vehicleDefaults,
      currentMileage,
    },
    services: extract.serviceRows.map((row) => ({
      shop: row.shop,
      serviceDate: row.serviceDate,
      mileage: row.mileage,
      lineItems: row.lineItems,
      total: row.total,
    })),
  };
};
