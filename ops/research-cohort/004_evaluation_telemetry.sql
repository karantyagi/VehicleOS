-- Forward-only evaluation telemetry. Apply after 003 in the dedicated
-- research Supabase project, never in the owner production project.
--
-- These fields contain no owner content: they distinguish whether a model
-- response satisfied the public contract from whether it yielded a usable
-- CARFAX service-history draft. They allow failure and quality rates to be
-- reported without retaining PDFs, VINs, filenames, drafts, or user ids.

alter table research_import_attempts
  add column if not exists schema_valid boolean null,
  add column if not exists usable_draft boolean not null default false;

alter table research_comparison_observations
  add column if not exists baseline_schema_valid boolean null,
  add column if not exists challenger_schema_valid boolean null,
  add column if not exists baseline_usable_draft boolean not null default false,
  add column if not exists challenger_usable_draft boolean not null default false;

-- Existing rows pre-date these measurements. Preserve that distinction: do
-- not infer schema validity from a historical status. A legacy successful
-- extraction was usable, however, so it remains comparable for draft rate.
update research_import_attempts
set usable_draft = true
where status = 'extracted' and usable_draft = false;

update research_comparison_observations
set
  baseline_usable_draft = baseline_status = 'extracted',
  challenger_usable_draft = challenger_status = 'extracted'
where baseline_usable_draft = false
  and challenger_usable_draft = false;
