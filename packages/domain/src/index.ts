export type { AggregateType, AppendDomainEventInput, DomainEventEnvelope } from "./events/types.js";
export {
  EVENT_TYPES,
  EVENT_VERSIONS,
  GOLDEN_PATH_FLOW,
  type CatalogDomainEvent,
  type DocumentExtractionCompletedPayload,
  type DocumentIngestedPayload,
  type DomainEventPayloadMap,
  type DomainEventType,
  type ExtractedServiceFields,
  type IngestChannel,
  type MaintenanceRecommendationCreatedPayload,
  type ServiceRecordedPayload,
  type ServiceUpdatedPayload,
  type ServiceRecordSource,
  type TaskCreatedPayload,
  type TaskDecidedPayload,
  type TaskDecision,
  type TaskStatus,
  type VehicleRecordEventType,
  type VehicleRecordRecordedPayload,
  type VehicleRecordSource,
} from "./events/catalog.js";

export type {
  EvidenceVaultEntry,
  NowQueueItem,
  OwnershipRecordEntry,
  QuoteAnalysisEntry,
  ServiceTimelineEntry,
  VehicleProjectionState,
} from "./projections/types.js";
export { applyEvent, createEmptyVehicleState, foldEvents } from "./projections/apply.js";

export type { MaintenanceRecommendation, PolicyEvaluationInput } from "./policy/types.js";
export type { PolicyEngine } from "./policy/policy-engine.js";
export { StubPolicyEngine } from "./policy/stub-policy-engine.js";

export type { EventStore } from "./ports/event-store.js";
export type { IngestAdapter, IngestCapture } from "./ports/ingest-adapter.js";
export type { JobPublisher, WorkerJobType } from "./ports/job-publisher.js";

export { InMemoryEventStore } from "./adapters/in-memory-event-store.js";
export { ReceiptUploadAdapter } from "./adapters/receipt-upload-adapter.js";

export {
  decideTask,
  confirmServiceWithConflictCheck,
  recordServiceAndRecommend,
  type GoldenPathResult,
  type RecordServiceInput,
  type ServiceConfirmResult,
} from "./golden-path/service-loop.js";
export { detectServiceConflict, type ServiceConflict } from "./conflicts/detect-service-conflict.js";
export {
  analyzeDealerQuote,
  parseQuoteText,
  type QuoteAnalysisResult,
  type QuoteLineAnalysis,
  type QuoteLineVerdict,
} from "./quotes/analyze-dealer-quote.js";
export { recordQuoteAnalysis } from "./quotes/record-quote-analysis.js";
export {
  buildResaleReport,
  type BuildResaleReportInput,
  type ResaleReportVehicle,
  type VehicleOSResaleReportV1,
} from "./export/build-resale-report.js";
export { formatResaleReportMarkdown } from "./export/format-resale-report-markdown.js";
export {
  parseVoiceServiceNote,
  type ParsedVoiceServiceNote,
  type ParseVoiceServiceNoteInput,
} from "./voice/parse-voice-service-note.js";
export {
  evaluateSeasonalPrompts,
  isSeasonalRuleId,
  seasonKeyForDate,
  type ClimateZone,
} from "./seasonal/evaluate-seasonal-prompts.js";
export {
  recordSeasonalPrompts,
  type RecordSeasonalPromptsInput,
  type RecordSeasonalPromptsResult,
} from "./seasonal/record-seasonal-prompts.js";
export {
  stubExtractManualSchedule,
  type ManualScheduleDraftRow,
  type StubExtractManualScheduleInput,
  type StubExtractManualScheduleResult,
} from "./knowledge/stub-extract-manual-schedule.js";
export { evaluateKnowledgeDue } from "./knowledge/evaluate-knowledge-due.js";
export {
  recordKnowledgeSchedule,
  type RecordKnowledgeScheduleInput,
  type RecordKnowledgeScheduleResult,
} from "./knowledge/record-knowledge-schedule.js";
export {
  enrichTimelineForDisplay,
  resolveServiceSource,
  serviceSourceLabel,
  sortTimelineEntries,
} from "./timeline/timeline-view.js";
export {
  classifyNowQueueItem,
  nowQueueCategoryLabel,
  splitNowQueue,
  type NowQueueCategory,
} from "./now/queue-view.js";
export {
  buildOwnerReminderView,
  buildOwnerReminderViews,
  buildOwnerVerificationViews,
  isActiveReminder,
  splitOwnerQueues,
  type OwnerReminderView,
  type OwnerVerificationSeverity,
  type OwnerVerificationTarget,
  type OwnerVerificationView,
} from "./now/build-owner-reminders.js";
export {
  formatOwnerDeadline,
  resolveAttentionWindow,
  resolveReminderUrgency,
  addDays,
  type AttentionWindow,
  type ReminderUrgency,
} from "./now/format-owner-deadline.js";
export {
  buildTimeFirstTaskCopy,
  matchScheduleRowForRule,
  projectScheduleRowsForRecommendations,
  type TimeFirstTaskCopy,
} from "./now/prepare-recommendation-task.js";
export {
  STALE_ODOMETER_DAYS,
  STALE_ODOMETER_RULE_ID,
  ensureStaleOdometerPrompt,
  isOdometerStale,
  resolveLastMileageTouchDate,
  todayIsoDate,
} from "./now/ensure-stale-odometer-prompt.js";
export {
  refreshMaintenanceRecommendation,
  type RefreshMaintenanceRecommendationInput,
  type RefreshMaintenanceRecommendationResult,
} from "./now/refresh-maintenance-recommendation.js";
export {
  computeVerificationMaturity,
  type AssistantMaturityStage,
  type ComputeVerificationMaturityInput,
  type VerificationMaturityView,
  type VerificationWeeklyBucket,
} from "./now/compute-verification-maturity.js";
export {
  projectMaintenanceSchedule,
  DEFAULT_EFFECTIVE_MILES_PER_YEAR,
  DEFAULT_SCHEDULE_HORIZON_MONTHS,
  DEFAULT_DUE_SOON_DAYS,
  EXTENDED_SCHEDULE_HORIZON_MONTHS,
  FULL_OEM_LIFE_CAP_YEARS,
  VERIFIED_PACK_MIN_ENTRIES,
  resolveScheduleHorizonEnd,
  type ProjectMaintenanceScheduleInput,
  type ProjectMaintenanceScheduleResult,
  type ScheduleHorizonMode,
  type ScheduleProjectionRow,
  type ScheduleProjectionStatus,
} from "./schedule/project-maintenance-schedule.js";
export {
  buildOwnerServiceScheduleBoard,
  type BuildOwnerServiceScheduleBoardInput,
  type OwnerServiceHistoryEvent,
  type OwnerServiceScheduleBoard,
  type OwnerServiceScheduleRow,
  type OwnerServiceVerdict,
} from "./schedule/build-owner-service-schedule-board.js";
export {
  buildMaintenanceItemIntelligence,
  type ActionRecommendation,
  type EvidenceState,
  type IntervalRecommendation,
  type MaintenanceItemIntelligence,
  type MaintenanceRationaleAxis,
  type MaintenanceRationaleAxisId,
  type MaintenanceServiceAction,
  type QualitativeConfidence,
} from "./schedule/build-maintenance-item-intelligence.js";
export {
  findLatestTireInstallation,
  resolveTireRotationEvidence,
  sortServiceTimeline,
  type TireRotationEvidence,
  type TireRotationEvidenceScope,
} from "./schedule/resolve-tire-rotation-evidence.js";
export {
  mergeServiceBenefitMemory,
} from "./owner-context/merge-service-benefit-memory.js";
export {
  buildOwnerDueItems,
  isOwnerDueItemActionable,
  type OwnerDueItem,
  type OwnerDueItemKind,
  type OwnerDueItemsSummary,
  type OwnerDueItemsView,
} from "./owner-care/build-owner-due-items.js";
export {
  buildOwnerHistoryTimeline,
  type OwnerHistoryItem,
  type OwnerHistoryItemKind,
} from "./owner-care/build-owner-history-timeline.js";
export { dueItemToRecommendation } from "./owner-care/due-item-to-recommendation.js";
export {
  evaluateNextDueRecommendation,
  evaluateNextDueRecommendationFromPolicyInput,
} from "./owner-care/evaluate-next-due-recommendation.js";
export {
  isOnboardingBaselineRule,
  ONBOARDING_BASELINE_DEADLINE_LABEL,
  ONBOARDING_BASELINE_REASON,
  ONBOARDING_BASELINE_RULE_ID,
  ONBOARDING_BASELINE_TITLE,
} from "./owner-care/onboarding-baseline.js";
export {
  computeOemServiceTiming,
  DEFAULT_OEM_TIMING_TOLERANCE_DAYS,
  type OemServiceTiming,
} from "./schedule/compute-oem-service-timing.js";
export {
  projectMaintenanceDeviations,
  type MaintenanceDeviationRecord,
} from "./schedule/project-maintenance-deviations.js";
export {
  DEVIATION_RULE_PREFIX,
  DEVIATION_RULE_SUFFIX,
  deviationRuleIdForEntry,
  parseDeviationRuleEntryId,
} from "./schedule/deviation-rule-id.js";
export {
  INTERVAL_RULE_PREFIX,
  INTERVAL_RULE_SUFFIX,
  intervalRuleIdForEntry,
  parseIntervalRuleEntryId,
} from "./schedule/interval-rule-id.js";
export {
  detectIntervalProposalForEntry,
  detectIntervalProposals,
  formatIntervalProposalTaskReason,
  formatIntervalProposalTaskTitle,
  type IntervalProposal,
} from "./schedule/detect-interval-proposal.js";
export {
  detectOwnerHabitProposals,
} from "./schedule/detect-owner-habit-proposals.js";
export {
  parseOwnerHabitNote,
  validateOwnerHabitProposal,
} from "./owner-habits/parse-owner-habit-note.js";
export { recordOwnerHabitProposal } from "./owner-habits/record-owner-habit-proposal.js";
export type {
  OwnerHabitCaptureChannel,
  OwnerHabitExtractionMethod,
  OwnerHabitProposalV1,
} from "./owner-habits/types.js";
export {
  OWNER_HABIT_DEFINITIONS,
  isOwnerHabitEntryId,
  type OwnerHabitDefinition,
} from "./schedule/owner-habit-definitions.js";
export { projectOwnerHabitScheduleRows } from "./schedule/project-owner-habit-schedule-rows.js";
export {
  ensureDeviationVerificationPrompts,
  type EnsureDeviationVerificationPromptsInput,
  type EnsureDeviationVerificationPromptsResult,
} from "./now/ensure-deviation-verification-prompts.js";
export {
  ensureIntervalVerificationPrompts,
  type EnsureIntervalVerificationPromptsInput,
  type EnsureIntervalVerificationPromptsResult,
} from "./now/ensure-interval-verification-prompts.js";
export {
  evaluateOwnershipRenewalDue,
  isRenewalRuleId,
  parseExpirationDate,
  projectOwnershipRenewals,
  DEFAULT_RENEWAL_LEAD_DAYS,
  type OwnershipRenewalProjection,
  type OwnershipRenewalStatus,
} from "./ownership/evaluate-ownership-renewals.js";
export {
  DRIVER_LICENSE_RENEWAL_RULE_ID,
  INSPECTION_RENEWAL_RULE_ID,
  OTHER_RENEWAL_RULE_ID,
  REGISTRATION_RENEWAL_GENERIC_RULE_ID,
  REGISTRATION_RENEWAL_MA_RULE_ID,
  resolveRenewalRuleId,
} from "./ownership/resolve-renewal-rule-id.js";
export {
  deriveOwnershipRecordsFromLineItems,
  type DerivedOwnershipRecord,
} from "./ownership/derive-ownership-from-line-items.js";
export {
  recordOwnershipFromServiceNote,
  type RecordOwnershipFromServiceNoteInput,
  type RecordOwnershipFromServiceNoteResult,
} from "./ownership/record-ownership-from-service-note.js";
export {
  findLastMatchingService,
  findMatchingServices,
  lineMatchesServiceName,
  serviceNamePattern,
  type ServiceMatchOptions,
} from "./knowledge/match-service-name.js";
export { enrichKnowledgeScheduleCanonicalIds } from "./knowledge/enrich-knowledge-schedule-canonical-ids.js";
export { dedupeKnowledgeScheduleEntries } from "./knowledge/dedupe-knowledge-schedule.js";
export {
  compileServiceAliasRegistry,
  lineMatchesCanonicalService,
  type ServiceAliasBundleInput,
  type ServiceAliasDefinition,
  type ServiceAliasRegistry,
} from "./knowledge/service-alias-registry.js";
export {
  recordVehicleOsImport,
  type RecordVehicleOsImportInput,
  type RecordVehicleOsImportResult,
  type VehicleOsImportService,
} from "./import/record-vehicleos-import.js";
export {
  recordVehicleOsRmvImport,
  type RecordVehicleOsRmvImportInput,
  type RecordVehicleOsRmvImportResult,
  type VehicleOsRmvRecord,
} from "./import/record-vehicleos-rmv-import.js";
export {
  ownerDriverLicenseFromRmvRecord,
  ownerDriverLicenseFingerprint,
  ownerDriverLicenseImportNeedsConfirmation,
  ownerDriverLicenseToOwnershipRecord,
  projectOwnerDriverLicenses,
  recordOwnerDriverLicense,
  recordOwnerDriverLicenses,
  type OwnerDriverLicense,
  type OwnerDriverLicenseDraft,
} from "./ownership/owner-driver-license.js";
export { parseCarfaxPdfText, type ParseCarfaxPdfTextResult } from "./import/parse-carfax-pdf-text.js";
export { parseRmvPdfText, type ParseRmvPdfTextResult } from "./import/parse-rmv-pdf-text.js";
export {
  filterNewImportServices,
  filterNewOwnershipRecords,
  isDuplicateServiceRow,
  serviceRowFingerprint,
  serviceVisitFingerprint,
  ownershipRecordFingerprint,
} from "./import/dedupe-import-rows.js";
export {
  extractCarfaxServiceHistoryFromPdfText,
  type ExtractCarfaxServiceHistoryInput,
} from "./import/extract-carfax-service-history.js";
export {
  extractMyRmvMaVehiclePageFromPdfText,
  extractMyRmvVin,
  isMyRmvPortalLayout,
  type ExtractMyRmvMaVehiclePageInput,
} from "./import/extract-myrmv-ma-vehicle-page.js";
export {
  mapCarfaxExtractToImport,
  type MapCarfaxExtractInput,
  type VehicleOsImportV1,
} from "./import/map-carfax-extract-to-import.js";
export {
  mapMyRmvExtractToImport,
  type MapMyRmvExtractInput,
  type VehicleOsRmvImportV1,
} from "./import/map-myrmv-extract-to-import.js";
export {
  isPlaceholderVin,
  normalizeVin,
  profileImportWarnings,
  reconcileImportVehicleProfile,
  type ImportVehicleProfile,
  type ProfileField,
  type ProfileImportConflict,
  type VehicleProfileSnapshot,
} from "./import/reconcile-import-vehicle-profile.js";
export {
  recordProfileImportVerification,
  type RecordProfileImportVerificationInput,
  type RecordProfileImportVerificationResult,
} from "./import/record-profile-import-verification.js";
export type {
  CarfaxServiceHistoryExtractV1,
  CarfaxServiceHistoryRowExtract,
  ExtractFieldConfidence,
  MyRmvMaVehiclePageExtractV1,
  MyRmvOwnerLicenseExtract,
  MyRmvRegistrationExtract,
  MyRmvTitleExtract,
  MyRmvVehicleExtract,
  VehicleImportDefaults,
} from "./import/extract-types.js";
export {
  AGGRESSIVE_DUE_SOON_DAYS,
  computeEffectiveMilesPerYear,
  computeObservedMilesPerYear,
  resolveDueSoonDays,
  resolveScheduleProjectionContext,
  type DrivingStyle,
  type ScheduleProjectionContext,
} from "./schedule/resolve-schedule-projection-context.js";
export type {
  OwnerContextMemory,
  MaintenancePatternMemory,
  IntervalOverlayMemory,
  IntervalBasis,
  ServiceBenefitMemory,
  TireRotationConditionId,
} from "./owner-context/types.js";
export {
  hasOwnerContextMemory,
  normalizeOwnerContextMemory,
} from "./owner-context/normalize-owner-context.js";
export {
  MAINTENANCE_DEVIATION_REASONS,
  maintenanceDeviationReasonLabel,
  type MaintenanceDeviationReasonId,
} from "./owner-context/deviation-reason-options.js";
export { mergeMaintenancePatternMemory } from "./owner-context/merge-maintenance-pattern-memory.js";
export {
  heuristicDraftDeviationReason,
  formatDraftDeviationTaskReason,
  type DraftDeviationReasonInput,
  type DraftDeviationReasonResult,
} from "./owner-context/draft-deviation-reason.js";
export {
  mergeIntervalOverlayMemory,
  removeIntervalOverlayMemory,
  resolveIntervalForEntry,
} from "./owner-context/merge-interval-overlay-memory.js";
export { formatIntervalOverlayLabel } from "./owner-context/format-interval-overlay-label.js";
export {
  classifyCaptureIntent,
  type CaptureIntent,
  type ClassifyCaptureIntentInput,
  type ClassifyCaptureIntentResult,
} from "./capture/classify-capture-intent.js";
export {
  heuristicReceiptExtract,
  type ReceiptExtractInput,
  type ReceiptExtractResult,
  type ReceiptExtractorPort,
} from "./ports/receipt-extractor.js";
export {
  mergeReceiptExtractWithHints,
  type ReceiptExtractHints,
} from "./ports/merge-receipt-extract.js";
export {
  enrichRecommendationReason,
  type EnrichRecommendationInput,
} from "./owner-context/enrich-recommendation-reason.js";
export {
  updateServiceRecord,
  type ServiceRecordPatch,
  type UpdateServiceRecordInput,
  type UpdateServiceRecordResult,
} from "./service/update-service-record.js";
export {
  findPossibleServiceDuplicates,
  mergeServiceRecords,
  type MergeServiceRecordsInput,
  type PossibleServiceDuplicate,
} from "./service/merge-service-records.js";
export {
  inferShopLocation,
  looksLikeShopAddressLine,
  resolveShopLocation,
} from "./import/infer-shop-location.js";
export {
  isCarfaxNoiseLineItem,
  normalizeCarfaxLineItems,
} from "./import/normalize-carfax-line-items.js";
export {
  isGenericCarfaxVisitLineItem,
  isVisitOnlyServiceRecord,
  maintenanceServiceHistory,
  resolveServiceRecordKind,
  stripGenericCarfaxVisitLineItems,
  type ServiceRecordKind,
} from "./service/service-record-kind.js";
export {
  mergeShopLocationsFromImport,
} from "./import/merge-shop-locations-from-import.js";
export {
  enrichVehicleOsImport,
  enrichVehicleOsImportService,
  type EnrichVehicleOsImportOptions,
  type VehicleOsImportDraft,
} from "./import/enrich-vehicleos-import.js";
export { normalizeShopKey } from "./import/shop-location-keys.js";
export {
  tierImportRows,
  tierNewImportRows,
  type ImportTrustTier,
  type TieredImportRow,
  type TierImportSummary,
} from "./import/tier-import-rows.js";
export {
  crossDayMileageRegressionByIndex,
  shouldFlagCrossDayMileageRegression,
  CROSS_DAY_MILEAGE_TOLERANCE_MI,
} from "./import/cross-day-mileage-regression.js";
export {
  mileageCrossDayGuidance,
  missingShopLocationGuidance,
  guidanceSummaryLine,
  type ImportVerifyGuidance,
  type ImportVerifyGuidanceCode,
} from "./import/import-verify-guidance.js";
export {
  acceptImportRowAsReportedMessage,
  evaluateImportReviewVerdict,
  type ImportReviewVerdict,
  type ImportReviewVerdictStatus,
} from "./import/import-review-verdict.js";
export {
  recordImportRowVerification,
  type RecordImportRowVerificationInput,
  type RecordImportRowVerificationResult,
} from "./import/record-import-row-verification.js";
export { CURATED_SHOP_PACK } from "./import/shop-pack.js";
export type {
  LookupShopLocationInput,
  LookupShopLocationResult,
  ShopLocationLookupPort,
} from "./import/lookup-shop-location-port.js";
export { stubLookupShopLocation } from "./import/stub-lookup-shop-location.js";
export {
  resolveShopLocationWithLookup,
  type ResolveShopLocationWithLookupInput,
} from "./import/resolve-shop-location-with-lookup.js";
export {
  enrichVehicleOsImportWithLookup,
  enrichVehicleOsImportWithLookupAndHints,
  enrichVehicleOsImportServiceWithLookup,
  enrichVehicleOsImportServicesWithLookup,
  type EnrichWithLookupOptions,
  type EnrichWithLookupResult,
} from "./import/enrich-vehicleos-import-with-lookup.js";
export {
  shopLocationHintFromLookup,
  type ShopLocationHint,
  type ShopLocationHintStatus,
} from "./import/shop-location-hints.js";
export {
  buildNominatimSearchQuery,
  buildNominatimSearchUrl,
  createNominatimShopLocationLookup,
  formatNominatimAddress,
  parseNominatimSearchResponse,
  abbreviateUsState,
  type NominatimFetch,
  type NominatimSearchResult,
} from "./import/nominatim-shop-location.js";
export type { KnowledgeScheduleRow } from "./events/catalog.js";
export type { KnowledgeScheduleEntry } from "./projections/types.js";
