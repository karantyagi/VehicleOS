import { extractMyRmvMaVehiclePageFromPdfText } from "./extract-myrmv-ma-vehicle-page.js";
import { mapMyRmvExtractToImport } from "./map-myrmv-extract-to-import.js";
import type { ParseRmvPdfTextResult } from "./parse-rmv-pdf-text.js";

const vehicleDefaultsFromExtract = (
  extract: NonNullable<ReturnType<typeof extractMyRmvMaVehiclePageFromPdfText>>,
) => ({
  vin: extract.vehicle.vin ?? "UNKNOWN-VIN",
  year: extract.vehicle.year ?? 2021,
  make: extract.vehicle.make ?? "Unknown",
  model: extract.vehicle.model ?? "Unknown",
  currentMileage: 0,
});

export const parseMyRmvPortalPdfText = (rawText: string): ParseRmvPdfTextResult | null => {
  const extract = extractMyRmvMaVehiclePageFromPdfText({ rawText });
  if (!extract) return null;

  const draft = mapMyRmvExtractToImport({
    extract,
    vehicleDefaults: vehicleDefaultsFromExtract(extract),
  });

  if (draft.records.length === 0) return null;

  return {
    records: draft.records,
    warnings: extract.warnings,
  };
};

export { extractMyRmvVin } from "./extract-myrmv-ma-vehicle-page.js";
