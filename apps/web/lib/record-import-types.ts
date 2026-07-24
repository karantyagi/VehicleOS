export type VehicleOsImportService = {
  shop: string;
  serviceDate: string;
  mileage: number;
  lineItems: string[];
  total: string;
  evidenceIds?: string[];
};

export type VehicleOsImportV1 = {
  version: "1";
  source: string;
  exportedAt: string;
  vehicle: {
    vin: string;
    year: number;
    make: string;
    model: string;
    trim?: string;
    currentMileage: number;
  };
  services: VehicleOsImportService[];
};

export type RecordImportCategoryId = "carfax" | "rmv";

export type RecordImportCategory = {
  id: RecordImportCategoryId;
  label: string;
  description: string;
  status: "json-ready" | "coming-soon";
  pdfInstructions: string[];
};

export const RECORD_IMPORT_CATEGORIES: RecordImportCategory[] = [
  {
    id: "carfax",
    label: "CARFAX service history",
    description: "Maintenance visits from CARFAX Car Care — feeds your service history and schedule baseline.",
    status: "json-ready",
    pdfInstructions: [
      "Sign in at carfax.com → Car Care → your vehicle → Service History.",
      "Print the full history page (Ctrl+P / Cmd+P) → Save as PDF.",
      "Return here and upload the PDF when extraction ships — or import JSON now.",
    ],
  },
  {
    id: "rmv",
    label: "RMV / DMV records",
    description:
      "Registration, title, and inspection events — not maintenance, but the assistant tracks them for ownership context.",
    status: "coming-soon",
    pdfInstructions: [
      "Sign in to your state RMV/DMV portal (e.g. Massachusetts myRMV).",
      "Open your vehicle registration or title summary → Print → Save as PDF.",
      "Upload will use the same review flow after CARFAX import is validated.",
    ],
  },
];

export const parseVehicleOsImportJson = (raw: string): { ok: true; data: VehicleOsImportV1 } | { ok: false; error: string } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid JSON — check formatting and try again." };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Import file must be a JSON object." };
  }

  const data = parsed as Partial<VehicleOsImportV1>;
  if (data.version !== "1") {
    return { ok: false, error: 'Import file must include "version": "1".' };
  }
  if (!Array.isArray(data.services) || data.services.length === 0) {
    return { ok: false, error: "Import file must include at least one service row." };
  }

  for (const [index, service] of data.services.entries()) {
    if (!service?.serviceDate?.trim()) {
      return { ok: false, error: `services[${index}].serviceDate is required.` };
    }
    if (!Number.isFinite(service.mileage)) {
      return { ok: false, error: `services[${index}].mileage is required.` };
    }
    if (!Array.isArray(service.lineItems) || service.lineItems.length === 0) {
      return { ok: false, error: `services[${index}].lineItems is required.` };
    }
  }

  return { ok: true, data: data as VehicleOsImportV1 };
};
