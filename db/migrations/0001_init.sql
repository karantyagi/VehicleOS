-- Initial schema sketch for VehicleOS vertical slice
create table if not exists vehicles (
  id uuid primary key,
  user_id uuid not null,
  vin text not null,
  year int not null,
  make text not null,
  model text not null,
  trim text,
  current_mileage int not null,
  created_at timestamptz not null default now()
);

create table if not exists domain_events (
  id uuid primary key,
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  event_version int not null default 1,
  payload_json jsonb not null,
  causation_id uuid,
  correlation_id uuid,
  created_at timestamptz not null default now()
);
