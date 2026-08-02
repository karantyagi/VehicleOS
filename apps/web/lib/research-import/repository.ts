import { createAdminClient } from "../supabase/admin";
import {
  RESEARCH_IMPORT_SOURCE,
  RESEARCH_PROMPT_VERSION,
  RESEARCH_SCHEMA_VERSION,
  type ResearchImportDraft,
  type ResearchImportRun,
  type ResearchRunStatus,
  type ResearchRunStoreInput,
} from "./types";

export const RESEARCH_IMPORT_BUCKET = "research-imports";

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
  draft_json: unknown;
  owner_draft_json: unknown;
  error_code: string | null;
};

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
  draft: row.draft_json as ResearchImportDraft | null,
  ownerDraft: row.owner_draft_json as ResearchImportDraft | null,
  errorCode: row.error_code,
});

const runColumns =
  "id, source, status, file_name, created_at, delete_after, text_character_count, model, prompt_version, draft_json, owner_draft_json, error_code";

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

export const updateResearchImportRun = async (input: {
  id: string;
  userId: string;
  status: ResearchRunStatus;
  model?: string | null;
  draft?: ResearchImportDraft | null;
  ownerDraft?: ResearchImportDraft | null;
  errorCode?: string | null;
}): Promise<ResearchImportRun | null> => {
  const admin = createAdminClient();
  const patch: Record<string, unknown> = {
    status: input.status,
  };
  if ("model" in input) patch.model = input.model ?? null;
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

export const deleteResearchImportRun = async (input: {
  id: string;
  userId: string;
}): Promise<"deleted" | "not-found"> => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("research_import_runs")
    .select("storage_key")
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.storage_key) return "not-found";

  const { error: storageError } = await admin.storage.from(RESEARCH_IMPORT_BUCKET).remove([data.storage_key]);
  if (storageError) throw new Error(storageError.message);

  const { error: deleteError } = await admin
    .from("research_import_runs")
    .delete()
    .eq("id", input.id)
    .eq("user_id", input.userId);
  if (deleteError) throw new Error(deleteError.message);
  return "deleted";
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

    const { error: deleteError } = await admin
      .from("research_import_runs")
      .delete()
      .eq("id", run.id)
      .lt("delete_after", now);
    if (!deleteError) deleted += 1;
  }
  return { considered: data?.length ?? 0, deleted };
};
