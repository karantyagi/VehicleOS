create index if not exists idx_domain_events_aggregate
  on domain_events (aggregate_type, aggregate_id, created_at);

create index if not exists idx_domain_events_vehicle_id
  on domain_events ((payload_json->>'vehicleId'), created_at);
