# Dogfood seed — Karan TLX (2021 Acura)

Creator dogfood profile mined from ChatGPT exports + CARFAX Car Care PDF.  
Strategy doc: [`creator-playbook-proc-0.md`](../../../../workspace/strategy/creator-playbook-proc-0.md)

## Files

| File | Purpose |
|------|---------|
| `owner-profile.v1.json` | Vehicle record + driving profile + `OwnerContextMemory` |
| `oem-schedule.v1.json` | OEM **Maintenance Minder** intervals from 2021 TLX owner's manual (P. 527) |
| `rmv-records.v1.json` | RMV/DMV ownership records (JSON dogfood) |
| `load-seed.ts` | Programmatic load (profile + CARFAX history + schedule refresh) |
| `../../../connectors/carfax-connect/examples/tlx-carfax-history.v1.json` | Service history source (also copied to web public) |
| `../../../apps/web/public/dogfood/karan-tlx/*.v1.json` | Hosted-app **Load dogfood JSON** buttons |

**OEM source PDF (local):** `~/Downloads/Acura-TLX_2021_EN-US_US_d046eed6ed.pdf` — 653 pp, Maintenance Minder at P. 523–527. Not committed to repo (21 MB); `oem-schedule.v1.json` is the extracted dogfood fixture.

## Hosted app — JSON dogfood (recommended)

Sign in at `app.vehicleos.app`, complete onboarding from `owner-profile.v1.json`, then:

| Step | Section | Action |
|------|---------|--------|
| 1 | **Record import → CARFAX** | **Load dogfood CARFAX JSON** → review → confirm |
| 2 | **Record import → RMV** | **Load dogfood RMV JSON** → review → confirm |
| 3 | **Manual & OEM** | **Load dogfood OEM JSON** → review → **Confirm schedule** |

Or paste/upload the `.v1.json` files from this folder (or `public/dogfood/karan-tlx/`).

**LLM extraction is not live** — PDF upload paths show “not yet initialized”; JSON is the dogfood path until ENG-2 / ENG-6 ship.

**Upcoming:** OEM manual via internal search agent (no PDF upload required).

## Load locally (CLI)

From repo root:

```bash
# In-memory (ephemeral — good for smoke)
USE_IN_MEMORY_EVENT_STORE=true pnpm dogfood:load-karan-tlx

# Postgres (persists — match apps/web DATABASE_URL)
DATABASE_URL="postgresql://..." pnpm dogfood:load-karan-tlx
```

Uses dev user `00000000-0000-4000-8000-000000000001` unless `DOGFOOD_USER_ID` is set.

## Validate CARFAX JSON

```bash
cd connectors/carfax-connect/cli
pnpm install
pnpm exec vehicleos-connect validate ../examples/tlx-carfax-history.v1.json
```

## Full schedule pack (v2, Jul 2026)

The dogfood TLX now hydrates **11 OEM rows** (MM subs 1–7 + oil/filter) from `acura-tlx-2021-sh-awd` / `acura-tlx-2021-technology` v2 packs.

**If you onboarded before this branch:** open the vehicle once — stub schedules (< 8 OEM rows) auto-upgrade to the v2 pack on load. No delete/re-onboard required unless hydration already recorded a full pack from an older catalog version.

**Schedule tab:** shows per-service drill-down (mileage timeline, CARFAX evidence, verdict) — not the old 3-month empty projection table.

## Seed facts (quick reference)

- **VIN:** 19UUB6F47MA008400 · **Mileage:** 58,819 (Jul 15, 2026)
- **Driving:** sporty · **~10k mi/yr** · **Boston / NE**
- **Tires:** Michelin Pilot Sport AS4 255/40ZR19 @ Costco (Jan 2025)
- **Battery:** Walmart EverStart · installed Ira Acura Westwood (Jul 2025)
- **Registration:** renewed Jul 2026 (awaiting new doc)
