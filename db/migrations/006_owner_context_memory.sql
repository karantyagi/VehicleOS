-- SCH-5: structured owner context for recommendation copy (not schedule math)
alter table vehicles
  add column if not exists owner_context_memory jsonb not null default '{}'::jsonb;
