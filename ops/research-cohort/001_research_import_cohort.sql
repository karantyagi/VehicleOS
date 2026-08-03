-- Isolated, invite-only research surface. Apply this only to the dedicated
-- Supabase research project, never the production owner project.

create table if not exists research_import_runs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source = 'carfax-pdf'),
  consent_version text not null,
  retain_for_evals boolean not null default false,
  file_name text not null,
  file_bytes integer not null check (file_bytes > 0 and file_bytes <= 15728640),
  content_sha256 text not null,
  storage_key text not null unique,
  text_character_count integer null check (text_character_count is null or text_character_count >= 0),
  status text not null check (
    status in ('uploaded', 'text-unavailable', 'model-not-configured', 'extracted', 'extract-failed', 'reviewed')
  ),
  model text null,
  prompt_version text not null,
  schema_version text not null,
  draft_json jsonb null,
  owner_draft_json jsonb null,
  error_code text null,
  delete_after timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists research_import_runs_user_created_idx
  on research_import_runs (user_id, created_at desc);

alter table research_import_runs enable row level security;

drop policy if exists "research import runs own select" on research_import_runs;
create policy "research import runs own select"
on research_import_runs for select to authenticated
using (user_id = auth.uid());

drop policy if exists "research import runs own delete" on research_import_runs;
create policy "research import runs own delete"
on research_import_runs for delete to authenticated
using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'research-imports',
  'research-imports',
  false,
  15728640,
  array['application/pdf']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
