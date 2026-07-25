export type ProfileField = "vin" | "year" | "make" | "model";

export type ProfileImportConflict = {
  field: ProfileField;
  savedValue: string;
  importValue: string;
  message: string;
};

export type VehicleProfileSnapshot = {
  vin: string;
  year: number;
  make: string;
  model: string;
};

export type ImportVehicleProfile = {
  vin?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
};

const PLACEHOLDER_VINS = new Set(["DEMO-VIN-001", "UNKNOWN-VIN"]);

export const isPlaceholderVin = (vin: string | null | undefined): boolean => {
  const normalized = vin?.trim().toUpperCase() ?? "";
  return normalized.length === 0 || PLACEHOLDER_VINS.has(normalized);
};

export const normalizeVin = (vin: string): string => vin.trim().toUpperCase();

const normalizeLabel = (value: string): string => value.trim().toLowerCase();

export const reconcileImportVehicleProfile = (
  saved: VehicleProfileSnapshot,
  imported: ImportVehicleProfile,
): {
  patch: Partial<VehicleProfileSnapshot>;
  conflicts: ProfileImportConflict[];
} => {
  const patch: Partial<VehicleProfileSnapshot> = {};
  const conflicts: ProfileImportConflict[] = [];

  const importVin = imported.vin?.trim();
  const vinIsMissing = isPlaceholderVin(saved.vin);

  if (importVin) {
    if (vinIsMissing) {
      patch.vin = importVin;
    } else if (normalizeVin(saved.vin) !== normalizeVin(importVin)) {
      conflicts.push({
        field: "vin",
        savedValue: saved.vin,
        importValue: importVin,
        message: `Your saved VIN (${saved.vin}) differs from the RMV PDF (${importVin}). Confirm which is correct before we update your vehicle record.`,
      });
    }
  }

  if (vinIsMissing && importVin) {
    if (typeof imported.year === "number" && Number.isFinite(imported.year)) {
      patch.year = imported.year;
    }
    if (imported.make?.trim()) {
      patch.make = imported.make.trim();
    }
    if (imported.model?.trim()) {
      patch.model = imported.model.trim();
    }
    return { patch, conflicts };
  }

  if (typeof imported.year === "number" && Number.isFinite(imported.year) && imported.year !== saved.year) {
    conflicts.push({
      field: "year",
      savedValue: String(saved.year),
      importValue: String(imported.year),
      message: `Your saved model year (${saved.year}) differs from the RMV PDF (${imported.year}).`,
    });
  }

  if (imported.make?.trim() && normalizeLabel(imported.make) !== normalizeLabel(saved.make)) {
    conflicts.push({
      field: "make",
      savedValue: saved.make,
      importValue: imported.make.trim(),
      message: `Your saved make (${saved.make}) differs from the RMV PDF (${imported.make.trim()}).`,
    });
  }

  if (imported.model?.trim() && normalizeLabel(imported.model) !== normalizeLabel(saved.model)) {
    conflicts.push({
      field: "model",
      savedValue: saved.model,
      importValue: imported.model.trim(),
      message: `Your saved model (${saved.model}) differs from the RMV PDF (${imported.model.trim()}).`,
    });
  }

  return { patch, conflicts };
};

export const profileImportWarnings = (
  saved: VehicleProfileSnapshot,
  imported: ImportVehicleProfile,
): string[] => {
  const { patch, conflicts } = reconcileImportVehicleProfile(saved, imported);
  const warnings: string[] = [];

  if (patch.vin) {
    warnings.push(`VIN ${patch.vin} from the PDF will be saved to your vehicle record when you confirm.`);
  }
  for (const conflict of conflicts) {
    warnings.push(conflict.message);
  }
  if (conflicts.length > 0) {
    warnings.push("Conflicts will appear in your assistant queue for verification before we change saved values.");
  }

  return warnings;
};
