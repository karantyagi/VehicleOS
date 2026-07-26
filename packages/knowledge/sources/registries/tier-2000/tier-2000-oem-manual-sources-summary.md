# VehicleOS PROC-KB OEM PDF Source Registry - 2,000-Pack Summary

Generated July 25, 2026 from `tier-2000-pack-targets.csv`.

## Outcome

The registry contains **2,000 rows for 2,000 input packs**, with **1,076 usable A/B/C rows (53.8%)** and **924 honestly blocked Tier D rows (46.2%)**.

All **263 unique referenced PDF URLs** passed the required live checks: HTTP 200, `application/pdf`, `%PDF` magic bytes, and a response size greater than 10 KB.

## Counts by source tier

| Source tier | Rows | Share | Registry treatment |
|---|---:|---:|---|
| A | 0 | 0.0% | Direct exact-pack source meeting the strictest override standard. |
| B | 921 | 46.1% | Validated official OEM PDF with exact model-year applicability or accepted OEM/model-year sharing. |
| C | 155 | 7.8% | Validated official document on an authoritative mirror, or a permitted adjacent-year fallback. |
| D | 924 | 46.2% | No qualifying direct PDF verified; `blocked_reason` records the limitation. |

No Tier A rows were assigned. Accepted official OEM maintenance booklets, all-model publications, and shared model-year schedules were conservatively classified as Tier B; exact-year Audi of America schedules hosted by NHTSA were classified as Tier C.

Every adjacent-model-year source is explicitly flagged in `notes` and has `confidence <= 0.75`.

## Counts by make

| Make | Total | A | B | C | D | Usable | Hit rate | Shared |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Acura | 70 | 0 | 61 | 0 | 9 | 61 | 87.1% | 43 |
| Audi | 186 | 0 | 0 | 112 | 74 | 112 | 60.2% | 77 |
| **BMW** | 215 | 0 | 205 | 4 | 6 | 209 | **97.2%** | 136 |
| Buick | 36 | 0 | 6 | 0 | 30 | 6 | 16.7% | 4 |
| Chevrolet | 77 | 0 | 40 | 0 | 37 | 40 | 51.9% | 26 |
| Chrysler | 18 | 0 | 0 | 0 | 18 | 0 | 0.0% | 0 |
| Ford | 66 | 0 | 6 | 0 | 60 | 6 | 9.1% | 4 |
| Genesis | 64 | 0 | 24 | 15 | 25 | 39 | 60.9% | 28 |
| Honda | 132 | 0 | 72 | 0 | 60 | 72 | 54.5% | 48 |
| Hyundai | 120 | 0 | 0 | 0 | 120 | 0 | 0.0% | 0 |
| Jeep | 18 | 0 | 0 | 0 | 18 | 0 | 0.0% | 0 |
| Kia | 99 | 0 | 0 | 0 | 99 | 0 | 0.0% | 0 |
| Lexus | 117 | 0 | 82 | 0 | 35 | 82 | 70.1% | 26 |
| Mazda | 63 | 0 | 30 | 0 | 33 | 30 | 47.6% | 20 |
| Mercedes-Benz | 148 | 0 | 0 | 0 | 148 | 0 | 0.0% | 0 |
| MINI | 36 | 0 | 36 | 0 | 0 | 36 | 100.0% | 30 |
| Mitsubishi | 18 | 0 | 3 | 0 | 15 | 3 | 16.7% | 2 |
| Nissan | 90 | 0 | 87 | 0 | 3 | 87 | 96.7% | 58 |
| Subaru | 72 | 0 | 12 | 24 | 36 | 36 | 50.0% | 35 |
| Tesla | 30 | 0 | 0 | 0 | 30 | 0 | 0.0% | 0 |
| Toyota | 168 | 0 | 151 | 0 | 17 | 151 | 89.9% | 92 |
| Volkswagen | 51 | 0 | 0 | 0 | 51 | 0 | 0.0% | 0 |
| Volvo | 106 | 0 | 106 | 0 | 0 | 106 | 100.0% | 93 |
| **Total** | **2,000** | **0** | **921** | **155** | **924** | **1,076** | **53.8%** | **722** |

**BMW hit rate:** 209/215 packs (97.2%); 205 Tier B, 4 Tier C, and 6 Tier D.

## Manual sharing

`manual_share_applied=yes` appears on **722 rows (36.1% of the full registry; 67.1% of usable rows)**: 609 Tier B and 113 Tier C.

All shared rows point to an existing `shared_from_pack_id`, and the referenced pack uses the same `primary_pdf_url`.

## Recommended `PACK_URL_OVERRIDES` for Tier A hits

There are no Tier A hits under the conservative classification, so the Tier A-only override recommendation is intentionally empty:

```ts
const PACK_URL_OVERRIDES: Record<string, string[]> = {};
```

Tier B rows remain valid ingestion candidates, but promoting them into production overrides should be a separate VehicleOS policy decision because many URLs intentionally serve multiple trims or an entire model-year lineup.

## Verification and QA

- 2,000 registry rows, 2,000 unique `pack_id` values, and priorities 1-2,000 with no gaps.
- Required 24-column header is exact, including column order; the CSV is UTF-8 without a BOM.
- The ten input identity columns match the source CSV on every row.
- Every sourced row has HTTP 200 and `application/pdf`; every Tier D row has an empty URL and a non-empty `blocked_reason`.
- 263/263 unique referenced URLs passed the full live byte-level validation sweep.
- Representative PDFs were text- and visually inspected for extractable maintenance content across BMW, Audi, Lexus, Acura, Toyota, Honda, Nissan, and MINI. This is representative content QA; the byte-level URL checks cover every referenced PDF.

## Representative validated source anchors

- [BMW sample - 2025 3 Series 330i](https://www.bmwusa.com/content/dam/bmw/marketUS/common/warranty-books/2025/BMW_MY25_Maintenance_with_BEVs.pdf)
- [Audi sample - 2022 A3 Premium](https://static.nhtsa.gov/odi/tsbs/2021/MC-10190993-0001.pdf)
- [Lexus sample - 2025 IS 300](https://assets.sia.toyota.com/publications/en/omms-s/L-MMS-25IS300/pdf/L-MMS-25IS300.pdf)
- [Acura sample - 2025 TLX Base](https://owners.acura.com/utility/download?path=%2Fstatic%2Fpdfs%2F2025%2FTLX%2F2025_TLX_Maintenance_Minder_System.pdf)
- [Genesis sample - 2025 G70 2.0T](https://owners.genesis.com/genesis/us/mygenesis/manuals/glovebox-manual/2024/g70/24MY%20G70%20OM.pdf)
- [Volvo sample - 2025 S60 B5 Core](https://azure-eu-assets.contentstack.com/v3/assets/bltccbab8edae0354cd/blt1f1676a16c88494e/6a29cb4fc1351a105b5ed89d/2025_FSM_Maintenance_Sheets_PHEV_MHEV_6.8.26.pdf)
- [Toyota sample - 2025 RAV4 LE](https://assets.sia.toyota.com/publications/en/omms-s/T-MMS-25RAV4/pdf/T-MMS-25RAV4.pdf)
- [Honda sample - 2025 CR-V EX](https://owners.honda.com/utility/download?path=%2Fstatic%2Fpdfs%2F2025%2FCR-V%2F2025_CR-V_Maintenance_Minder_System.PDF)
- [Nissan sample - 2025 Rogue S](https://www.nissanusa.com/content/dam/Nissan/us/manuals-and-guides/rogue/2025/2025-nissan-rogue-owner-manual.pdf)
- [MINI sample - 2025 Cooper Classic](https://www.miniusa.com/content/dam/mini/PDF/warranties/MINI_MY2025_All_Models_Maintenance_2025-03-07_1K.pdf)

## Blocked luxury follow-up

The luxury follow-up queue contains **297 Tier D packs**, sorted by priority in `tier-2000-blocked-luxury-queue.md`.
