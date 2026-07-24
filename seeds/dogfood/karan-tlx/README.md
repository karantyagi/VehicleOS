# Dogfood seed — Karan TLX (2021 Acura)

Creator dogfood profile mined from ChatGPT exports + CARFAX Car Care PDF.  
Strategy doc: [`creator-playbook-proc-0.md`](../../../../workspace/strategy/creator-playbook-proc-0.md)

## Files

| File | Purpose |
|------|---------|
| `owner-profile.v1.json` | Vehicle record + driving profile + `OwnerContextMemory` |
| `load-seed.ts` | Programmatic load (profile + CARFAX history + schedule refresh) |
| `../../../connectors/carfax-connect/examples/tlx-carfax-history.v1.json` | Service history (28 rows) |

## Load locally

From repo root:

```bash
# In-memory (ephemeral — good for smoke)
USE_IN_MEMORY_EVENT_STORE=true pnpm dogfood:load-karan-tlx

# Postgres (persists — match apps/web DATABASE_URL)
DATABASE_URL="postgresql://..." pnpm dogfood:load-karan-tlx
```

Uses dev user `00000000-0000-4000-8000-000000000001` unless `DOGFOOD_USER_ID` is set.

## Load on hosted app (manual — no server script)

1. Sign in at `app.vehicleos.app`.
2. **Onboarding** — enter profile fields from `owner-profile.v1.json` (VIN, mileage 58819, aggressive, owned since Mar 2021).
3. **Record import** → CARFAX → upload `tlx-carfax-history.v1.json` → confirm.

Re-import skips duplicate rows automatically.

## Validate CARFAX JSON

```bash
cd connectors/carfax-connect/cli
pnpm install
pnpm exec vehicleos-connect validate ../examples/tlx-carfax-history.v1.json
```

## Seed facts (quick reference)

- **VIN:** 19UUB6F47MA008400 · **Mileage:** 58,819 (Jul 15, 2026)
- **Driving:** aggressive · **~10k mi/yr** · **Boston / NE**
- **Tires:** Michelin Pilot Sport AS4 255/40ZR19 @ Costco (Jan 2025)
- **Battery:** Walmart EverStart · installed Ira Acura Westwood (Jul 2025)
- **Registration:** renewed Jul 2026 (awaiting new doc)
