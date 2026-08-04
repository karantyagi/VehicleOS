import { createAdminClient } from "../supabase/admin";
import { attemptMetrics, canSkipSourceAdjudication } from "./comparison";
import { parseResearchImportDraft } from "./draft";
import { researchReviewProgress } from "./review";
import {
  RESEARCH_IMPORT_SOURCE,
  RESEARCH_IMPORT_BUCKET,
  RESEARCH_PROMPT_VERSION,
  RESEARCH_SCHEMA_VERSION,
  type ResearchAdjudicationStatus,
  type ResearchAttemptMetrics,
  type ResearchAttemptStoreInput,
  type ResearchComparisonObservation,
  type ResearchDeletionAuditEvent,
  type ResearchExtractionAttempt,
  type ResearchExtractionStrategy,
  type ResearchImportDraft,
  type ResearchImportRun,
  type ResearchOperatorRun,
  type ResearchRunStatus,
  type ResearchRunStoreInput,
} from "./types";

export { RESEARCH_IMPORT_BUCKET } from "./types";

type ResearchRunRow = {
  id: string;
  source: string;
  status: ResearchRunStatus;
  file_name: string;
  created_at: string;
  delete_after: string;
  text_character_count: number | null;
  model: string | null;
  prompt_version: string;
  assigned_strategy: ResearchExtractionStrategy | null;
  displayed_strategy: ResearchExtractionStrategy | null;
  display_override_reason: string | null;
  draft_json: unknown;
  owner_draft_json: unknown;
  error_code: string | null;
};

type ResearchAttemptRow = {
  strategy: ResearchExtractionStrategy;
  status: ResearchExtractionAttempt["status"];
  model: string | null;
  prompt_version: string;
  schema_version: string;
  input_character_count: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  latency_ms: number | null;
  estimated_cost_usd: number | string | null;
  provider_request_id: string | null;
  schema_valid: boolean | null;
  usable_draft: boolean;
  draft_json: unknown;
  error_code: string | null;
};

type ResearchOperatorRunRow = ResearchRunRow & {
  consent_version: string;
  adjudication_status: ResearchAdjudicationStatus;
  adjudication_notes: string | null;
  adjudicated_at: string | null;
  research_import_attempts: ResearchAttemptRow[] | null;
};

type ResearchObservationRow = {
  id: string;
  run_id: string | null;
  displayed_strategy: ResearchExtractionStrategy | null;
  baseline_status: ResearchExtractionAttempt["status"];
  challenger_status: ResearchExtractionAttempt["status"];
  baseline_metrics: unknown;
  challenger_metrics: unknown;
  baseline_latency_ms: number | null;
  challenger_latency_ms: number | null;
  baseline_total_tokens: number | null;
  challenger_total_tokens: number | null;
  baseline_estimated_cost_usd: number | string | null;
  challenger_estimated_cost_usd: number | string | null;
  baseline_schema_valid: boolean | null;
  challenger_schema_valid: boolean | null;
  baseline_usable_draft: boolean;
  challenger_usable_draft: boolean;
  adjudication_status: ResearchAdjudicationStatus;
  observed_at: string;
};

type ResearchQuotaRow = {
  successful_drafts: number;
  active_slots: number;
};

export type ResearchParticipantQuota = {
  successfulDrafts: number;
  activeSlots: number;
  limit: number;
  remaining: number;
};

const nullableNumber = (value: number | string | null): number | null => {
  if (value === null) return null;
  const number = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(number) ? number : null;
};

const storedDraft = (value: unknown): ResearchImportDraft | null =>
  parseResearchImportDraft(value);

const rowToRun = (row: ResearchRunRow): ResearchImportRun => ({
  id: row.id,
  source: RESEARCH_IMPORT_SOURCE,
  status: row.status,
  fileName: row.file_name,
  createdAt: row.created_at,
  deleteAfter: row.delete_after,
  textCharacterCount: row.text_character_count,
  model: row.model,
  promptVersion: row.prompt_version,
  draft: storedDraft(row.draft_json),
  ownerDraft: storedDraft(row.owner_draft_json),
  errorCode: row.error_code,
});

const rowToAttempt = (row: ResearchAttemptRow): ResearchExtractionAttempt => ({
  strategy: row.strategy,
  status: row.status,
  model: row.model,
  promptVersion: row.prompt_version,
  schemaVersion: row.schema_version,
  inputCharacterCount: row.input_character_count,
  inputTokens: row.input_tokens,
  outputTokens: row.output_tokens,
  totalTokens: row.total_tokens,
  latencyMs: row.latency_ms,
  estimatedCostUsd: nullableNumber(row.estimated_cost_usd),
  providerRequestId: row.provider_request_id,
  schemaValid: row.schema_valid,
  usableDraft: row.usable_draft,
  draft: storedDraft(row.draft_json),
  errorCode: row.error_code,
});

const rowToObservation = (row: ResearchObservationRow): ResearchComparisonObservation => ({
  id: row.id,
  runId: row.run_id,
  displayedStrategy: row.displayed_strategy,
  baselineStatus: row.baseline_status,
  challengerStatus: row.challenger_status,
  baselineMetrics: row.baseline_metrics as ResearchAttemptMetrics | null,
  challengerMetrics: row.challenger_metrics as ResearchAttemptMetrics | null,
  baselineLatencyMs: row.baseline_latency_ms,
  challengerLatencyMs: row.challenger_latency_ms,
  baselineTotalTokens: row.baseline_total_tokens,
  challengerTotalTokens: row.challenger_total_tokens,
  baselineEstimatedCostUsd: nullableNumber(row.baseline_estimated_cost_usd),
  challengerEstimatedCostUsd: nullableNumber(row.challenger_estimated_cost_usd),
  baselineSchemaValid: row.baseline_schema_valid,
  challengerSchemaValid: row.challenger_schema_valid,
  baselineUsableDraft: row.baseline_usable_draft,
  challengerUsableDraft: row.challenger_usable_draft,
  adjudicationStatus: row.adjudication_status,
  observedAt: row.observed_at,
});

const runColumns =
  "id, source, status, file_name, created_at, delete_after, text_character_count, model, prompt_version, assigned_strategy, displayed_strategy, display_override_reason, draft_json, owner_draft_json, error_code";
const attemptColumns =
  "strategy, status, model, prompt_version, schema_version, input_character_count, input_tokens, output_tokens, total_tokens, latency_ms, estimated_cost_usd, provider_request_id, schema_valid, usable_draft, draft_json, error_code";
const observationColumns =
  "id, run_id, displayed_strategy, baseline_status, challenger_status, baseline_metrics, challenger_metrics, baseline_latency_ms, challenger_latency_ms, baseline_total_tokens, challenger_total_tokens, baseline_estimated_cost_usd, challenger_estimated_cost_usd, baseline_schema_valid, challenger_schema_valid, baseline_usable_draft, challenger_usable_draft, adjudication_status, observed_at";

export const createResearchImportRun = async (input: ResearchRunStoreInput): Promise<ResearchImportRun> => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("research_import_runs")
    .insert({
      id: input.id,
      user_id: input.userId,
      source: RESEARCH_IMPORT_SOURCE,
      consent_version: input.consentVersion,
      retain_for_evals: input.retainForEvals,
      file_name: input.fileName,
      file_bytes: input.fileBytes,
      content_sha256: input.contentSha256,
      storage_key: input.storageKey,
      text_character_count: input.textCharacterCount,
      status: input.status,
      model: input.model,
      prompt_version: input.promptVersion ?? RESEARCH_PROMPT_VERSION,
      schema_version: RESEARCH_SCHEMA_VERSION,
      assigned_strategy: input.assignedStrategy,
      draft_json: input.draft ?? null,
      owner_draft_json: input.ownerDraft ?? null,
      error_code: input.errorCode ?? null,
      delete_after: input.deleteAfter,
    })
    .select(runColumns)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create research import run");
  return rowToRun(data as ResearchRunRow);
};

export const discardInitializedResearchImportRun = async (input: { id: string; userId: string }): Promise<void> => {
  const admin = createAdminClient();
  const { error } = await admin
    .from("research_import_runs")
    .delete()
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .eq("status", "uploaded");
  if (error) throw new Error(error.message);
};

export const reserveResearchImportQuota = async (input: {
  runId: string;
  subjectHmac: string;
  limit: number;
}): Promise<boolean> => {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reserve_research_import_quota", {
    p_run_id: input.runId,
    p_subject_hmac: input.subjectHmac,
    p_max_successful_drafts: input.limit,
  });
  if (error) throw new Error(error.message);
  return data === true;
};

export const completeResearchImportQuota = async (runId: string): Promise<boolean> => {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("complete_research_import_quota", { p_run_id: runId });
  if (error) throw new Error(error.message);
  return data === true;
};

export const releaseResearchImportQuota = async (runId: string): Promise<boolean> => {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("release_research_import_quota", { p_run_id: runId });
  if (error) throw new Error(error.message);
  return data === true;
};

export const getResearchParticipantQuota = async (input: {
  subjectHmac: string;
  limit: number;
}): Promise<ResearchParticipantQuota> => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("research_participant_quotas")
    .select("successful_drafts, active_slots")
    .eq("subject_hmac", input.subjectHmac)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as ResearchQuotaRow | null;
  const successfulDrafts = row?.successful_drafts ?? 0;
  const activeSlots = row?.active_slots ?? 0;
  return {
    successfulDrafts,
    activeSlots,
    limit: input.limit,
    remaining: Math.max(0, input.limit - successfulDrafts - activeSlots),
  };
};

export const claimResearchImportRunForProcessing = async (input: {
  id: string;
  userId: string;
}): Promise<{
  id: string;
  storageKey: string;
  fileName: string;
  fileBytes: number;
  contentSha256: string;
  assignedStrategy: ResearchExtractionStrategy;
} | null> => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("research_import_runs")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .eq("status", "uploaded")
    .select("id, storage_key, file_name, file_bytes, content_sha256, assigned_strategy")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.assigned_strategy) return null;
  return {
    id: data.id,
    storageKey: data.storage_key,
    fileName: data.file_name,
    fileBytes: data.file_bytes,
    contentSha256: data.content_sha256,
    assignedStrategy: data.assigned_strategy as ResearchExtractionStrategy,
  };
};

export const updateResearchImportSourceAnalysis = async (input: {
  id: string;
  userId: string;
  contentSha256: string;
  fileBytes: number;
  textCharacterCount: number;
}): Promise<void> => {
  const admin = createAdminClient();
  const { error } = await admin
    .from("research_import_runs")
    .update({
      content_sha256: input.contentSha256,
      file_bytes: input.fileBytes,
      text_character_count: input.textCharacterCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("user_id", input.userId);
  if (error) throw new Error(error.message);
};

export const createResearchImportAttempts = async (
  inputs: ResearchAttemptStoreInput[],
): Promise<ResearchExtractionAttempt[]> => {
  if (!inputs.length) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("research_import_attempts")
    .upsert(
      inputs.map((input) => ({
        run_id: input.runId,
        strategy: input.strategy,
        status: input.status,
        model: input.model,
        prompt_version: input.promptVersion ?? RESEARCH_PROMPT_VERSION,
        schema_version: RESEARCH_SCHEMA_VERSION,
        input_character_count: input.inputCharacterCount ?? null,
        input_tokens: input.inputTokens ?? null,
        output_tokens: input.outputTokens ?? null,
        total_tokens: input.totalTokens ?? null,
        latency_ms: input.latencyMs ?? null,
        estimated_cost_usd: input.estimatedCostUsd ?? null,
        provider_request_id: input.providerRequestId ?? null,
        schema_valid: input.schemaValid ?? null,
        usable_draft: input.usableDraft ?? false,
        draft_json: input.draft ?? null,
        error_code: input.errorCode ?? null,
      })),
      { onConflict: "run_id,strategy" },
    )
    .select(attemptColumns);
  if (error) throw new Error(error.message);
  return ((data ?? []) as ResearchAttemptRow[]).map(rowToAttempt);
};

export const updateResearchImportRun = async (input: {
  id: string;
  userId: string;
  status: ResearchRunStatus;
  model?: string | null;
  displayedStrategy?: ResearchExtractionStrategy | null;
  displayOverrideReason?: string | null;
  draft?: ResearchImportDraft | null;
  ownerDraft?: ResearchImportDraft | null;
  errorCode?: string | null;
}): Promise<ResearchImportRun | null> => {
  const admin = createAdminClient();
  const patch: Record<string, unknown> = { status: input.status, updated_at: new Date().toISOString() };
  if ("model" in input) patch.model = input.model ?? null;
  if ("displayedStrategy" in input) patch.displayed_strategy = input.displayedStrategy ?? null;
  if ("displayOverrideReason" in input) patch.display_override_reason = input.displayOverrideReason ?? null;
  if ("errorCode" in input) patch.error_code = input.errorCode ?? null;
  if (input.draft !== undefined) patch.draft_json = input.draft;
  if (input.ownerDraft !== undefined) patch.owner_draft_json = input.ownerDraft;

  const { data, error } = await admin
    .from("research_import_runs")
    .update(patch)
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .select(runColumns)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToRun(data as ResearchRunRow) : null;
};

export const listResearchImportRuns = async (userId: string): Promise<ResearchImportRun[]> => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("research_import_runs")
    .select(runColumns)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return ((data ?? []) as ResearchRunRow[]).map(rowToRun);
};

export const getResearchParticipantPdfUrl = async (input: { id: string; userId: string }): Promise<string | null> => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("research_import_runs")
    .select("storage_key")
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const storageKey = (data as { storage_key?: string } | null)?.storage_key;
  if (!storageKey) return null;
  const { data: signedData, error: signedError } = await admin.storage
    .from(RESEARCH_IMPORT_BUCKET)
    .createSignedUrl(storageKey, 300);
  if (signedError || !signedData?.signedUrl) throw new Error(signedError?.message ?? "Could not sign research PDF");
  return signedData.signedUrl;
};

export const listResearchOperatorRuns = async (): Promise<ResearchOperatorRun[]> => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("research_import_runs")
    .select(`${runColumns}, consent_version, adjudication_status, adjudication_notes, adjudicated_at, research_import_attempts(${attemptColumns})`)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ResearchOperatorRunRow[]).map((row) => ({
    ...rowToRun(row),
    consentVersion: row.consent_version,
    assignedStrategy: row.assigned_strategy,
    displayedStrategy: row.displayed_strategy,
    displayOverrideReason: row.display_override_reason,
    attempts: (row.research_import_attempts ?? []).map(rowToAttempt),
    adjudicationStatus: row.adjudication_status,
    adjudicationNotes: row.adjudication_notes,
    adjudicatedAt: row.adjudicated_at,
  }));
};

export const getResearchOperatorRunDetail = async (
  runId: string,
): Promise<{ run: ResearchOperatorRun; pdfUrl: string } | null> => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("research_import_runs")
    .select(`${runColumns}, consent_version, adjudication_status, adjudication_notes, adjudicated_at, storage_key, research_import_attempts(${attemptColumns})`)
    .eq("id", runId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as unknown as ResearchOperatorRunRow & { storage_key: string };
  const { data: signedData, error: signedError } = await admin.storage
    .from(RESEARCH_IMPORT_BUCKET)
    .createSignedUrl(row.storage_key, 300);
  if (signedError || !signedData?.signedUrl) throw new Error(signedError?.message ?? "Could not sign research PDF");
  return {
    run: {
      ...rowToRun(row),
      consentVersion: row.consent_version,
      assignedStrategy: row.assigned_strategy,
      displayedStrategy: row.displayed_strategy,
      displayOverrideReason: row.display_override_reason,
      attempts: (row.research_import_attempts ?? []).map(rowToAttempt),
      adjudicationStatus: row.adjudication_status,
      adjudicationNotes: row.adjudication_notes,
      adjudicatedAt: row.adjudicated_at,
    },
    pdfUrl: signedData.signedUrl,
  };
};

export const listResearchComparisonObservations = async (): Promise<ResearchComparisonObservation[]> => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("research_comparison_observations")
    .select(observationColumns)
    .order("observed_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  return ((data ?? []) as ResearchObservationRow[]).map(rowToObservation);
};

export const listResearchDeletionAuditEvents = async (): Promise<ResearchDeletionAuditEvent[]> => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("research_deletion_audit_events")
    .select("id, action, outcome, object_count, error_class, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    action: row.action as ResearchDeletionAuditEvent["action"],
    outcome: row.outcome as ResearchDeletionAuditEvent["outcome"],
    objectCount: row.object_count,
    errorClass: row.error_class,
    createdAt: row.created_at,
  }));
};

export const refreshResearchComparisonObservation = async (runId: string): Promise<void> => {
  const admin = createAdminClient();
  const { data: runData, error: runError } = await admin
    .from("research_import_runs")
    .select("id, consent_version, displayed_strategy, owner_draft_json")
    .eq("id", runId)
    .maybeSingle();
  if (runError) throw new Error(runError.message);
  if (!runData) return;

  const { data: attemptData, error: attemptError } = await admin
    .from("research_import_attempts")
    .select(attemptColumns)
    .eq("run_id", runId);
  if (attemptError) throw new Error(attemptError.message);

  const attempts = ((attemptData ?? []) as ResearchAttemptRow[]).map(rowToAttempt);
  const baseline = attempts.find((attempt) => attempt.strategy === "text-first");
  const challenger = attempts.find((attempt) => attempt.strategy === "direct-pdf");
  if (!baseline || !challenger) return;
  const ownerDraft = storedDraft(runData.owner_draft_json);
  const reviewComplete = ownerDraft ? researchReviewProgress(ownerDraft).complete : false;
  const baselineMetrics = ownerDraft && reviewComplete ? attemptMetrics(baseline, ownerDraft) : null;
  const challengerMetrics = ownerDraft && reviewComplete ? attemptMetrics(challenger, ownerDraft) : null;
  const adjudicationStatus: ResearchAdjudicationStatus = reviewComplete && canSkipSourceAdjudication({
    baseline,
    challenger,
    baselineMetrics,
    challengerMetrics,
  })
    ? "not-required"
    : "pending";
  const now = new Date().toISOString();

  const { error: observationError } = await admin.from("research_comparison_observations").upsert(
    {
      run_id: runId,
      consent_version: runData.consent_version,
      displayed_strategy: runData.displayed_strategy,
      baseline_status: baseline.status,
      challenger_status: challenger.status,
      baseline_metrics: baselineMetrics,
      challenger_metrics: challengerMetrics,
      baseline_latency_ms: baseline.latencyMs,
      challenger_latency_ms: challenger.latencyMs,
      baseline_total_tokens: baseline.totalTokens,
      challenger_total_tokens: challenger.totalTokens,
      baseline_estimated_cost_usd: baseline.estimatedCostUsd,
      challenger_estimated_cost_usd: challenger.estimatedCostUsd,
      baseline_schema_valid: baseline.schemaValid,
      challenger_schema_valid: challenger.schemaValid,
      baseline_usable_draft: baseline.usableDraft,
      challenger_usable_draft: challenger.usableDraft,
      adjudication_status: adjudicationStatus,
      observed_at: now,
      updated_at: now,
    },
    { onConflict: "run_id" },
  );
  if (observationError) throw new Error(observationError.message);

  if (ownerDraft) {
    const { error: runUpdateError } = await admin
      .from("research_import_runs")
      .update({ adjudication_status: adjudicationStatus, updated_at: now })
      .eq("id", runId);
    if (runUpdateError) throw new Error(runUpdateError.message);
  }
};

export const updateResearchAdjudication = async (input: {
  runId: string;
  operatorId: string;
  status: Exclude<ResearchAdjudicationStatus, "pending">;
  notes: string | null;
}): Promise<boolean> => {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("research_import_runs")
    .update({
      adjudication_status: input.status,
      adjudication_notes: input.notes,
      adjudicated_at: now,
      adjudicated_by: input.operatorId,
      updated_at: now,
    })
    .eq("id", input.runId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return false;

  const { error: observationError } = await admin
    .from("research_comparison_observations")
    .update({ adjudication_status: input.status, updated_at: now })
    .eq("run_id", input.runId);
  if (observationError) throw new Error(observationError.message);
  return true;
};

export const recordResearchOperatorAudit = async (input: {
  operatorId: string;
  action: "view-report" | "view-run-detail" | "adjudicate-run";
  runId?: string | null;
}): Promise<void> => {
  const admin = createAdminClient();
  const { error } = await admin.from("research_operator_audit_events").insert({
    operator_user_id: input.operatorId,
    action: input.action,
    run_id: input.runId ?? null,
  });
  if (error) throw new Error(error.message);
};

const recordResearchDeletionAudit = async (input: {
  action: "delete-run" | "delete-participant" | "retention-cleanup";
  outcome: "succeeded" | "failed" | "partial";
  objectCount: number;
  errorClass?: string | null;
}): Promise<void> => {
  try {
    const admin = createAdminClient();
    await admin.from("research_deletion_audit_events").insert({
      action: input.action,
      outcome: input.outcome,
      object_count: input.objectCount,
      error_class: input.errorClass ?? null,
    });
  } catch {
    // Deletion must not be rolled back because its privacy-safe audit write failed.
  }
};

export const deleteResearchImportRun = async (input: {
  id: string;
  userId: string;
}): Promise<"deleted" | "not-found"> => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("research_import_runs")
    .select("id, storage_key")
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.storage_key) return "not-found";

  const { error: storageError } = await admin.storage.from(RESEARCH_IMPORT_BUCKET).remove([data.storage_key]);
  if (storageError) {
    await recordResearchDeletionAudit({ action: "delete-run", outcome: "failed", objectCount: 0, errorClass: "storage-remove-failed" });
    throw new Error(storageError.message);
  }

  await releaseResearchImportQuota(data.id).catch(() => null);

  const { error: deleteError } = await admin
    .from("research_import_runs")
    .delete()
    .eq("id", input.id)
    .eq("user_id", input.userId);
  if (deleteError) {
    await recordResearchDeletionAudit({ action: "delete-run", outcome: "failed", objectCount: 1, errorClass: "database-delete-failed" });
    throw new Error(deleteError.message);
  }
  await recordResearchDeletionAudit({ action: "delete-run", outcome: "succeeded", objectCount: 1 });
  return "deleted";
};

export const deleteResearchParticipantData = async (userId: string): Promise<void> => {
  const admin = createAdminClient();
  const { data, error } = await admin.from("research_import_runs").select("id, storage_key").eq("user_id", userId);
  if (error) throw new Error(error.message);

  const storageKeys = (data ?? []).map((run) => run.storage_key).filter((key): key is string => Boolean(key));
  if (storageKeys.length > 0) {
    const { error: storageError } = await admin.storage.from(RESEARCH_IMPORT_BUCKET).remove(storageKeys);
    if (storageError) {
      await recordResearchDeletionAudit({ action: "delete-participant", outcome: "failed", objectCount: 0, errorClass: "storage-remove-failed" });
      throw new Error(storageError.message);
    }
  }

  await Promise.all((data ?? []).map((run) => releaseResearchImportQuota(run.id).catch(() => null)));

  const { error: deleteError } = await admin.from("research_import_runs").delete().eq("user_id", userId);
  if (deleteError) {
    await recordResearchDeletionAudit({ action: "delete-participant", outcome: "failed", objectCount: storageKeys.length, errorClass: "database-delete-failed" });
    throw new Error(deleteError.message);
  }
  await recordResearchDeletionAudit({ action: "delete-participant", outcome: "succeeded", objectCount: storageKeys.length });
};

export const purgeExpiredResearchImportRuns = async (limit = 20): Promise<{ considered: number; deleted: number }> => {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("research_import_runs")
    .select("id, storage_key")
    .lt("delete_after", now)
    .order("delete_after", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  let deleted = 0;
  for (const run of data ?? []) {
    const { error: storageError } = await admin.storage.from(RESEARCH_IMPORT_BUCKET).remove([run.storage_key]);
    if (storageError) continue;

    await releaseResearchImportQuota(run.id).catch(() => null);

    const { error: deleteError } = await admin
      .from("research_import_runs")
      .delete()
      .eq("id", run.id)
      .lt("delete_after", now);
    if (!deleteError) deleted += 1;
  }
  await recordResearchDeletionAudit({
    action: "retention-cleanup",
    outcome: deleted === (data?.length ?? 0) ? "succeeded" : deleted === 0 ? "failed" : "partial",
    objectCount: deleted,
    errorClass: deleted === (data?.length ?? 0) ? null : "one-or-more-deletions-failed",
  });
  return { considered: data?.length ?? 0, deleted };
};
