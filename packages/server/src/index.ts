export { getApiServices, type BuildServicesOptions } from "./get-services.js";
export { createApiServices, type ApiServices } from "./services/index.js";
export {
  createShopLocationLookupService,
  type ShopLocationLookupServiceOptions,
} from "./services/shop-location-lookup-service.js";
export { deleteUserData } from "./account/delete-user-data.js";
export { getPool, closePool } from "./db/pool.js";
export { extractPdfText } from "./import/pdf-text.js";
export {
  createVehicle,
  decideOnTask,
  deleteVehicle,
  getVehicle,
  getVehicleState,
  listVehicles,
  submitReceipt,
  queueReceiptExtract,
  previewReceiptExtract,
  updateVehicle,
} from "./http/golden-path-handlers.js";
export { analyzeQuote } from "./http/quote-handlers.js";
export { getEvidenceAccessUrl } from "./http/evidence-handlers.js";
export { exportResaleReport, type ExportFormat, type ExportHandlerResponse } from "./http/export-handlers.js";
export { submitVoiceMemory } from "./http/voice-handlers.js";
export { submitOwnerHabit } from "./http/owner-habit-handlers.js";
export { saveOwnerDriverLicense } from "./http/owner-driver-license-handlers.js";
export { refreshSeasonalPrompts } from "./http/seasonal-handlers.js";
export { confirmManualSchedule, previewManualSchedule } from "./http/manual-handlers.js";
export { submitOwnerServiceNote } from "./http/note-handlers.js";
export { submitVehicleOsImport, submitVehicleOsRmvImport, extractRecordImportPdf, enrichVehicleOsImportDraftHandler } from "./http/import-handlers.js";
export { mergeVehicleServices, updateVehicleService } from "./http/service-handlers.js";
export { refreshNowQueue } from "./http/now-handlers.js";
export { checkVehicleSupport, listSupportedVehicles, assertVehicleCreateAllowed } from "./http/catalog-handlers.js";
export type { VehicleSupportQuery, ListSupportedVehiclesOptions } from "./http/catalog-handlers.js";
export { decodeVinIdentity, isFullVin, normalizeVinForLookup } from "./http/vin-identity-handlers.js";
export type { VinIdentityDecodeBody } from "./http/vin-identity-handlers.js";
export {
  previewVehicleRequestContact,
  resolveVehicleRequestContactEmail,
  submitVehicleRequest,
} from "./http/vehicle-request-handlers.js";
export type { VehicleRequestContactPreview, VehicleRequestInput } from "./http/vehicle-request-handlers.js";
export { InMemoryVehicleRepository } from "./repositories/in-memory-vehicle-repository.js";
export type { VehicleRepositoryLike } from "./types/repositories.js";
