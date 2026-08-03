-- Paired text-first/direct-PDF evaluation. Apply only after 001 in the
-- dedicated research Supabase project, never in the owner production project.

alter table research_import_runs
  add column if not exists assigned_strategy text null
    check (assigned_strategy in ('text-first', 'direct-pdf')),
  add column if not exists displayed_strategy text null
    check (displayed_strategy in ('text-first', 'direct-pdf')),
  add column if not exists display_override_reason text null,
  add column if not exists adjudication_status text not null default 'not-required'
    check (adjudication_status in ('pending', 'confirmed', 'corrected', 'not-required')),
  add column if not exists adjudication_notes text null,
  add column if not exists adjudicated_at timestamptz null,
  add column if not exists adjudicated_by uuid null references auth.users(id) on delete set null;

alter table research_import_runs
  drop constraint if exists research_import_runs_status_check;
alter table research_import_runs
  add constraint research_import_runs_status_check check (
    status in ('uploaded', 'processing', 'text-unavailable', 'model-not-configured', 'extracted', 'extract-failed', 'reviewed')
  );

create table if not exists research_import_attempts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references research_import_runs(id) on delete cascade,
  strategy text not null check (strategy in ('text-first', 'direct-pdf')),
  status text not null check (
    status in ('text-unavailable', 'model-not-configured', 'extracted', 'extract-failed')
  ),
  model text null,
  prompt_version text not null,
  schema_version text not null,
  input_character_count integer null check (input_character_count is null or input_character_count >= 0),
  input_tokens integer null check (input_tokens is null or input_tokens >= 0),
  output_tokens integer null check (output_tokens is null or output_tokens >= 0),
  total_tokens integer null check (total_tokens is null or total_tokens >= 0),
  latency_ms integer null check (latency_ms is null or latency_ms >= 0),
  estimated_cost_usd numeric(12, 8) null check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  provider_request_id text null,
  draft_json jsonb null,
  error_code text null,
  created_at timestamptz not null default now(),
  unique (run_id, strategy)
);

create index if not exists research_import_attempts_run_idx
  on research_import_attempts (run_id);

alter table research_import_attempts enable row level security;

-- No authenticated-browser policy is intentional. Participants receive only
-- the selected draft through the server API; only the service role can compare
-- both attempts.

drop policy if exists "research participant uploads initialized pdf" on storage.objects;
create policy "research participant uploads initialized pdf"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'research-imports'
  and exists (
    select 1
    from public.research_import_runs run
    where run.user_id = auth.uid()
      and run.storage_key = name
      and run.status = 'uploaded'
  )
);

create table if not exists research_comparison_observations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid null unique references research_import_runs(id) on delete set null,
  consent_version text not null,
  displayed_strategy text null check (displayed_strategy in ('text-first', 'direct-pdf')),
  baseline_status text not null,
  challenger_status text not null,
  baseline_metrics jsonb null,
  challenger_metrics jsonb null,
  baseline_latency_ms integer null,
  challenger_latency_ms integer null,
  baseline_total_tokens integer null,
  challenger_total_tokens integer null,
  baseline_estimated_cost_usd numeric(12, 8) null,
  challenger_estimated_cost_usd numeric(12, 8) null,
  adjudication_status text not null default 'pending'
    check (adjudication_status in ('pending', 'confirmed', 'corrected', 'not-required')),
  observed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists research_comparison_observations_observed_idx
  on research_comparison_observations (observed_at desc);

alter table research_comparison_observations enable row level security;

-- Observations contain counts and ratios only. When a run is deleted, run_id
-- becomes null while this anonymous measurement remains available for cohort
-- reporting. No PDF, VIN, provider, filename, draft, or user id is copied.

create table if not exists research_operator_audit_events (
  id uuid primary key default gen_random_uuid(),
  operator_user_id uuid null references auth.users(id) on delete set null,
  action text not null check (action in ('view-report', 'view-run-detail', 'adjudicate-run')),
  run_id uuid null references research_import_runs(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table research_operator_audit_events
  drop constraint if exists research_operator_audit_events_action_check;
alter table research_operator_audit_events
  add constraint research_operator_audit_events_action_check
  check (action in ('view-report', 'view-run-detail', 'adjudicate-run'));

create index if not exists research_operator_audit_events_created_idx
  on research_operator_audit_events (created_at desc);

alter table research_operator_audit_events enable row level security;

create table if not exists research_deletion_audit_events (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('delete-run', 'delete-participant', 'retention-cleanup')),
  outcome text not null check (outcome in ('succeeded', 'failed', 'partial')),
  object_count integer not null default 0 check (object_count >= 0),
  error_class text null,
  created_at timestamptz not null default now()
);

create index if not exists research_deletion_audit_events_created_idx
  on research_deletion_audit_events (created_at desc);

alter table research_deletion_audit_events enable row level security;
