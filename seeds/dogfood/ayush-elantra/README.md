# Ayush Elantra dogfood

Friend-car dogfood profile from CARFAX Car Care PDF (Jul 27, 2026) + myRMV extract.

| File | Purpose |
|------|---------|
| `owner-profile.v1.json` | VIN, YMM, mileage, owner context |
| `load-seed.ts` | CLI loader (profile + CARFAX import + schedule refresh) |
| `../../../connectors/carfax-connect/examples/ayush-elantra-carfax-history.v1.json` | Service history source |
| `../../../connectors/rmv-connect/examples/ayush-elantra-myrmv-import.v1.json` | RMV records source |
| `../../../apps/web/public/dogfood/ayush-elantra/*.v1.json` | Hosted-app **Load dogfood JSON** buttons |
| `../oem-extracts/hyundai-elantra-2022/oem-schedule.v1.json` | OEM schedule extract (2022 manual) |

**Vehicle:** 2022 Hyundai Elantra SEL · VIN `KMHLS4AG3NU293303` · ~34,045 mi

**OEM pack:** `hyundai-elantra-2022-sel` (10 schedule rows, 2022 Owner's Manual P. 9-9–9-11)

## Hosted app — JSON dogfood

1. Onboarding → pick **2022 Hyundai Elantra SEL**
2. **Record import → CARFAX** → Load dogfood CARFAX JSON → confirm
3. **Record import → RMV** → Load dogfood RMV JSON → confirm
4. Schedule hydrates from catalog pack automatically at vehicle create

Or paste/upload `.v1.json` files from `public/dogfood/ayush-elantra/`.

## CLI seed loader

```bash
USE_IN_MEMORY_EVENT_STORE=true pnpm dogfood:load-ayush-elantra
```

```bash
DATABASE_URL="postgresql://..." pnpm dogfood:load-ayush-elantra
```

Validate CARFAX fixture:

```bash
pnpm exec vehicleos-connect validate connectors/carfax-connect/examples/ayush-elantra-carfax-history.v1.json
```
