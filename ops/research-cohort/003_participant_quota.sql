-- Pilot quota. Apply only after 001 and 002 in the dedicated research
-- Supabase project, never in the production owner project.
--
-- The subject is an application-generated HMAC of the normalized email. It
-- lets deletion remove account-bound source data without resetting the pilot
-- limit, while this table retains no raw email, user id, PDF, or draft.

create table if not exists research_participant_quotas (
  subject_hmac text primary key check (subject_hmac ~ '^[a-f0-9]{64}$'),
  successful_drafts integer not null default 0 check (successful_drafts >= 0),
  active_slots integer not null default 0 check (active_slots >= 0),
  updated_at timestamptz not null default now()
);

alter table research_participant_quotas enable row level security;

create table if not exists research_participant_quota_reservations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid null unique references research_import_runs(id) on delete set null,
  subject_hmac text not null references research_participant_quotas(subject_hmac) on delete restrict,
  state text not null check (state in ('reserved', 'completed', 'released')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists research_participant_quota_reservations_subject_idx
  on research_participant_quota_reservations (subject_hmac, state);

alter table research_participant_quota_reservations enable row level security;

create or replace function reserve_research_import_quota(
  p_run_id uuid,
  p_subject_hmac text,
  p_max_successful_drafts integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_quota research_participant_quotas%rowtype;
begin
  if p_max_successful_drafts < 1 or p_max_successful_drafts > 10 then
    raise exception 'invalid_research_quota_limit';
  end if;

  insert into research_participant_quotas (subject_hmac)
  values (p_subject_hmac)
  on conflict (subject_hmac) do nothing;

  select * into current_quota
  from research_participant_quotas
  where subject_hmac = p_subject_hmac
  for update;

  if current_quota.active_slots >= 1
    or current_quota.successful_drafts + current_quota.active_slots >= p_max_successful_drafts then
    return false;
  end if;

  insert into research_participant_quota_reservations (run_id, subject_hmac, state)
  values (p_run_id, p_subject_hmac, 'reserved');

  update research_participant_quotas
  set active_slots = active_slots + 1, updated_at = now()
  where subject_hmac = p_subject_hmac;

  return true;
end;
$$;

create or replace function complete_research_import_quota(p_run_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation_subject text;
begin
  update research_participant_quota_reservations
  set state = 'completed', updated_at = now()
  where run_id = p_run_id and state = 'reserved'
  returning subject_hmac into reservation_subject;

  if reservation_subject is null then
    return false;
  end if;

  update research_participant_quotas
  set successful_drafts = successful_drafts + 1,
      active_slots = greatest(active_slots - 1, 0),
      updated_at = now()
  where subject_hmac = reservation_subject;

  return true;
end;
$$;

create or replace function release_research_import_quota(p_run_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation_subject text;
begin
  update research_participant_quota_reservations
  set state = 'released', updated_at = now()
  where run_id = p_run_id and state = 'reserved'
  returning subject_hmac into reservation_subject;

  if reservation_subject is null then
    return false;
  end if;

  update research_participant_quotas
  set active_slots = greatest(active_slots - 1, 0), updated_at = now()
  where subject_hmac = reservation_subject;

  return true;
end;
$$;

revoke all on function reserve_research_import_quota(uuid, text, integer) from public;
revoke all on function complete_research_import_quota(uuid) from public;
revoke all on function release_research_import_quota(uuid) from public;
grant execute on function reserve_research_import_quota(uuid, text, integer) to service_role;
grant execute on function complete_research_import_quota(uuid) to service_role;
grant execute on function release_research_import_quota(uuid) to service_role;
