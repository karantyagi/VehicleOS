-- SCH-2: Owner profile fields on vehicles (owned since + driving habits)
alter table vehicles
  add column if not exists owned_since date null,
  add column if not exists driving_style text null
    check (driving_style in ('economical', 'casual', 'aggressive')),
  add column if not exists stated_miles_per_year int null
    check (stated_miles_per_year is null or (stated_miles_per_year >= 1000 and stated_miles_per_year <= 80000)),
  add column if not exists stated_miles_per_year_updated_at timestamptz null;
