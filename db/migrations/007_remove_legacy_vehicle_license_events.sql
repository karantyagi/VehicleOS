-- Driver licenses now belong to the owner aggregate. This removes only the
-- retired vehicle-scoped representation; it does not touch owner credentials.
delete from domain_events
where aggregate_type = 'vehicle'
  and event_type = 'vehicle.record.recorded'
  and payload_json->>'eventType' = 'license';
