import type { VehicleOsImportService, VehicleOsImportDraft, VehicleOsRmvRecord } from "@vehicleos/domain";
import {
  enrichVehicleOsImportServicesWithLookup,
  enrichVehicleOsImportWithLookup,
  enrichVehicleOsImportWithLookupAndHints,
  extractCarfaxServiceHistoryFromPdfText,
  extractMyRmvMaVehiclePageFromPdfText,
  mapCarfaxExtractToImport,
  mapMyRmvExtractToImport,
  mergeShopLocationsFromImport,
  parseRmvPdfText,
  profileImportWarnings,
  reconcileImportVehicleProfile,
  recordProfileImportVerification,
  recordImportRowVerification,
  tierImportRows,
} from "@vehicleos/domain";
import type { ApiServices } from "../services/index.js";
import { extractPdfText } from "../import/pdf-text.js";
import { jsonResponse, type JsonResponse } from "./json-response.js";
import { buildVehicleStateView } from "./vehicle-state-view.js";

type VehicleOsImportBody = {
  version?: "1";
  source?: string;
  exportedAt?: string;
  vehicle?: {
    currentMileage?: number;
  };
  services?: VehicleOsImportService[];
};

type AuthContext = {
  userId: string;
};

const unauthorized = (): JsonResponse => jsonResponse(401, { error: "Unauthorized" });

const forbidden = (): JsonResponse => jsonResponse(403, { error: "Forbidden" });

type VehicleWithOwnerContext = NonNullable<Awaited<ReturnType<ApiServices["vehicles"]["findById"]>>>;

const enrichLookupOptions = (
  vehicle: VehicleWithOwnerContext,
  services: ApiServices,
) => ({
  ownerShopLocations: vehicle.ownerContextMemory?.shopLocations,
  hintCity: vehicle.ownerContextMemory?.primaryCity,
  lookupPort: services.shopLocationLookup,
});

export const enrichVehicleOsImportDraftHandler = async (
  services: ApiServices,
  vehicleId: string,
  body: { draft?: VehicleOsImportDraft },
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();

  const vehicle = await services.vehicles.findById(vehicleId);
  if (!vehicle) return jsonResponse(404, { error: "Vehicle not found" });
  if (vehicle.userId !== auth.userId) return forbidden();

  if (!body.draft?.services?.length) {
    return jsonResponse(400, { error: "draft.services is required" });
  }

  const { draft, shopLocationHints } = await enrichVehicleOsImportWithLookupAndHints(
    body.draft,
    enrichLookupOptions(vehicle, services),
  );

  return jsonResponse(200, { draft, shopLocationHints });
};

export const submitVehicleOsImport = async (
  services: ApiServices,
  vehicleId: string,
  body: VehicleOsImportBody,
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();

  const vehicle = await services.vehicles.findById(vehicleId);
  if (!vehicle) return jsonResponse(404, { error: "Vehicle not found" });
  if (vehicle.userId !== auth.userId) return forbidden();

  const importServices = body.services ?? [];
  if (importServices.length === 0) {
    return jsonResponse(400, { error: "services array is required" });
  }

  for (const [index, service] of importServices.entries()) {
    if (!service.serviceDate?.trim()) {
      return jsonResponse(400, { error: `services[${index}].serviceDate is required` });
    }
    if (!Number.isFinite(service.mileage)) {
      return jsonResponse(400, { error: `services[${index}].mileage is required` });
    }
    if (!Array.isArray(service.lineItems) || service.lineItems.length === 0) {
      return jsonResponse(400, { error: `services[${index}].lineItems is required` });
    }
  }

  const ownerShopLocations = vehicle.ownerContextMemory?.shopLocations;
  const enrichedServices = await enrichVehicleOsImportServicesWithLookup(importServices, {
    ...enrichLookupOptions(vehicle, services),
    ownerShopLocations,
  });

  const tierSummary = tierImportRows(enrichedServices);

  const importResult = await services.goldenPath.importVehicleOsHistory({
    vehicleId,
    importSource: body.source?.trim() || "vehicleos-import",
    services: enrichedServices,
  });

  const mergedShopLocations = mergeShopLocationsFromImport(ownerShopLocations, enrichedServices);
  const shopMemoryUpdated =
    Object.keys(mergedShopLocations).length !== Object.keys(ownerShopLocations ?? {}).length ||
    JSON.stringify(mergedShopLocations) !== JSON.stringify(ownerShopLocations ?? {});

  let workingVehicle = vehicle;
  if (shopMemoryUpdated) {
    const patched = await services.vehicles.update(vehicleId, auth.userId, {
      ownerContextMemory: {
        ...(vehicle.ownerContextMemory ?? {}),
        shopLocations: mergedShopLocations,
      },
    });
    if (patched) workingVehicle = patched;
  }

  const nextMileage = body.vehicle?.currentMileage;
  const shouldUpdateMileage =
    typeof nextMileage === "number" &&
    Number.isFinite(nextMileage) &&
    nextMileage > workingVehicle.currentMileage;
  const updatedVehicle = shouldUpdateMileage
    ? await services.vehicles.update(vehicleId, auth.userId, { currentMileage: nextMileage })
    : workingVehicle;

  const verification = await recordImportRowVerification({
    eventStore: services.eventStore,
    input: {
      vehicleId,
      rows: tierSummary.rows,
      importSource: body.source?.trim() || "vehicleos-import",
    },
  });

  const view = buildVehicleStateView(importResult.state, updatedVehicle ?? workingVehicle);

  return jsonResponse(201, {
    importedCount: importResult.importedCount,
    skippedCount: importResult.skippedCount,
    importSource: body.source?.trim() || "vehicleos-import",
    timeline: view.timeline,
    maintenanceSchedule: view.maintenanceSchedule,
    verificationTaskId: verification.taskId ?? undefined,
    shopLocationsSaved: shopMemoryUpdated ? Object.keys(mergedShopLocations).length : undefined,
    importReview: {
      autoCount: tierSummary.autoCount,
      enrichedCount: tierSummary.enrichedCount,
      verifyCount: tierSummary.verifyCount,
      blockCount: tierSummary.blockCount,
    },
  });
};

type VehicleOsRmvImportBody = {
  version?: "1";
  source?: string;
  exportedAt?: string;
  vehicle?: {
    vin?: string;
    year?: number;
    make?: string;
    model?: string;
    currentMileage?: number;
  };
  records?: VehicleOsRmvRecord[];
};

const vehicleProfileSnapshot = (vehicle: {
  vin: string;
  year: number;
  make: string;
  model: string;
}) => ({
  vin: vehicle.vin,
  year: vehicle.year,
  make: vehicle.make,
  model: vehicle.model,
});

const mergeRmvProfileWarnings = (
  vehicle: { vin: string; year: number; make: string; model: string },
  imported: VehicleOsRmvImportBody["vehicle"],
  baseWarnings: string[],
): string[] => {
  if (!imported) return baseWarnings;
  return [...baseWarnings, ...profileImportWarnings(vehicleProfileSnapshot(vehicle), imported)];
};

export type RecordImportCategory = "carfax" | "rmv";

const MAX_IMPORT_PDF_BYTES = 15 * 1024 * 1024;

export const extractRecordImportPdf = async (
  services: ApiServices,
  vehicleId: string,
  input: { category: RecordImportCategory; pdfBuffer: Buffer; fileName: string },
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();

  const vehicle = await services.vehicles.findById(vehicleId);
  if (!vehicle) return jsonResponse(404, { error: "Vehicle not found" });
  if (vehicle.userId !== auth.userId) return forbidden();

  if (input.pdfBuffer.byteLength === 0) {
    return jsonResponse(400, { error: "PDF file is empty" });
  }
  if (input.pdfBuffer.byteLength > MAX_IMPORT_PDF_BYTES) {
    return jsonResponse(413, { error: "PDF exceeds 15 MB limit" });
  }

  let text = "";
  try {
    text = await extractPdfText(input.pdfBuffer);
  } catch {
    return jsonResponse(422, { error: "Could not read PDF text. Try re-exporting from your browser." });
  }

  if (!text.trim()) {
    return jsonResponse(422, { error: "PDF contained no extractable text. Use print-to-PDF, not a scanned image." });
  }

  const exportedAt = new Date().toISOString();
  const vehicleBlock = {
    vin: vehicle.vin,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim ?? undefined,
    currentMileage: vehicle.currentMileage,
  };

  if (input.category === "carfax") {
    const extract = extractCarfaxServiceHistoryFromPdfText({
      rawText: text,
      source: "carfax-pdf-extract",
      extractedAt: exportedAt,
    });

    if (extract.serviceRows.length === 0) {
      return jsonResponse(422, {
        error: "No CARFAX service rows found. Open Service History in Car Care, then print the full page to PDF.",
      });
    }

    const mappedDraft = mapCarfaxExtractToImport({
      extract,
      vehicleDefaults: vehicleBlock,
      exportedAt,
      importSource: "carfax-pdf-extract",
    });
    const draft = await enrichVehicleOsImportWithLookup(mappedDraft, enrichLookupOptions(vehicle, services));

    return jsonResponse(200, {
      category: "carfax",
      extractor: "rules-v1",
      extractLayer: "carfax-service-history.extract.v1",
      warnings: extract.warnings,
      extract,
      draft,
    });
  }

  const myRmvExtract = extractMyRmvMaVehiclePageFromPdfText({
    rawText: text,
    source: "myrmv-pdf-extract",
    extractedAt: exportedAt,
  });

  if (myRmvExtract) {
    const draft = mapMyRmvExtractToImport({
      extract: myRmvExtract,
      vehicleDefaults: vehicleBlock,
      exportedAt,
      importSource: "myrmv-pdf-extract",
    });

    if (draft.records.length === 0) {
      return jsonResponse(422, {
        error: "No RMV ownership rows mapped from myRMV PDF. Check the vehicle page export.",
      });
    }

    return jsonResponse(200, {
      category: "rmv",
      extractor: "rules-v1",
      extractLayer: "myrmv-ma-vehicle-page.extract.v1",
      warnings: mergeRmvProfileWarnings(vehicle, draft.vehicle, myRmvExtract.warnings),
      extract: myRmvExtract,
      draft,
    });
  }

  const parsed = parseRmvPdfText(text);
  if (parsed.records.length === 0) {
    return jsonResponse(422, {
      error: "No RMV/DMV ownership rows found. Print your registration or title summary from myRMV (or equivalent).",
    });
  }

  const fallbackDraft = {
    version: "1" as const,
    source: "rmv-pdf-extract",
    exportedAt,
    vehicle: vehicleBlock,
    records: parsed.records,
  };

  return jsonResponse(200, {
    category: "rmv",
    extractor: "rules-v1",
    extractLayer: "carfax-embedded-dmv-fallback",
    warnings: mergeRmvProfileWarnings(vehicle, fallbackDraft.vehicle, parsed.warnings),
    draft: fallbackDraft,
  });
};

export const submitVehicleOsRmvImport = async (
  services: ApiServices,
  vehicleId: string,
  body: VehicleOsRmvImportBody,
  auth?: AuthContext,
): Promise<JsonResponse> => {
  if (!auth?.userId) return unauthorized();

  const vehicle = await services.vehicles.findById(vehicleId);
  if (!vehicle) return jsonResponse(404, { error: "Vehicle not found" });
  if (vehicle.userId !== auth.userId) return forbidden();

  const records = body.records ?? [];
  if (records.length === 0) {
    return jsonResponse(400, { error: "records array is required" });
  }

  for (const [index, record] of records.entries()) {
    if (!record.recordDate?.trim()) {
      return jsonResponse(400, { error: `records[${index}].recordDate is required` });
    }
    if (!record.description?.trim()) {
      return jsonResponse(400, { error: `records[${index}].description is required` });
    }
    if (!Array.isArray(record.details) || record.details.length === 0) {
      return jsonResponse(400, { error: `records[${index}].details is required` });
    }
  }

  const importResult = await services.goldenPath.importVehicleOsRmvHistory({
    vehicleId,
    importSource: body.source?.trim() || "vehicleos-rmv-import",
    records,
  });

  const importSource = body.source?.trim() || "vehicleos-rmv-import";
  const savedProfile = vehicleProfileSnapshot(vehicle);
  const { patch: profilePatch, conflicts } = reconcileImportVehicleProfile(
    savedProfile,
    body.vehicle ?? {},
  );

  let workingVehicle = vehicle;
  if (Object.keys(profilePatch).length > 0) {
    const patched = await services.vehicles.update(vehicleId, auth.userId, profilePatch);
    if (patched) workingVehicle = patched;
  }

  const verification = await recordProfileImportVerification({
    eventStore: services.eventStore,
    input: { vehicleId, conflicts, importSource },
  });

  const nextMileage = body.vehicle?.currentMileage;
  const shouldUpdateMileage =
    typeof nextMileage === "number" &&
    Number.isFinite(nextMileage) &&
    nextMileage > workingVehicle.currentMileage;
  const updatedVehicle = shouldUpdateMileage
    ? await services.vehicles.update(vehicleId, auth.userId, { currentMileage: nextMileage })
    : workingVehicle;

  const view = buildVehicleStateView(importResult.state, updatedVehicle ?? workingVehicle);

  return jsonResponse(201, {
    importedCount: importResult.importedCount,
    skippedCount: importResult.skippedCount,
    importSource,
    ownershipRecords: view.ownershipRecords,
    profilePatch: Object.keys(profilePatch).length > 0 ? profilePatch : undefined,
    verificationTaskId: verification.taskId ?? undefined,
    profileConflicts: conflicts.length > 0 ? conflicts : undefined,
  });
};
