insert into vehicles (id, user_id, vin, year, make, model, trim, current_mileage)
values (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '3VWFE21C04M000001',
  2020,
  'Toyota',
  'Camry',
  'LE',
  48210
)
on conflict do nothing;
