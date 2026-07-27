# Tier 2000 OEM manual sources v3 summary

Validated 2026-07-26. This patch registry contains exactly the 913 identities from `tier-2000-tier-d-retry.csv`.

## Results

| Tier | Rows |
|---|---:|
| B — OEM PDF | 219 |
| C — attributable mirror | 101 |
| D — blocked/unverified | 593 |
| **Total** | **913** |

## Integrity

- 913 unique output `pack_id` values exactly match the retry input identities
  and ordering.
- 320 sourced rows resolve to 114 unique PDFs and 114 matching SHA-256 values.
- 206 reused rows preserve their first validated pack through
  `manual_share_applied=yes` and `shared_from_pack_id`.

## By make

| Make | Total | B | C | D |
|---|---:|---:|---:|---:|
| Acura | 9 | 0 | 0 | 9 |
| Audi | 77 | 0 | 0 | 77 |
| BMW | 6 | 0 | 0 | 6 |
| Buick | 30 | 0 | 18 | 12 |
| Chevrolet | 37 | 8 | 20 | 9 |
| Chrysler | 18 | 0 | 6 | 12 |
| Ford | 58 | 16 | 18 | 24 |
| Genesis | 25 | 8 | 0 | 17 |
| Honda | 57 | 50 | 0 | 7 |
| Hyundai | 117 | 48 | 24 | 45 |
| Jeep | 18 | 0 | 6 | 12 |
| Kia | 95 | 0 | 6 | 89 |
| Lexus | 35 | 29 | 0 | 6 |
| Mazda | 33 | 24 | 0 | 9 |
| Mercedes-Benz | 148 | 0 | 0 | 148 |
| Mitsubishi | 15 | 0 | 0 | 15 |
| Nissan | 3 | 0 | 0 | 3 |
| Subaru | 36 | 36 | 0 | 0 |
| Tesla | 28 | 0 | 0 | 28 |
| Toyota | 17 | 0 | 0 | 17 |
| Volkswagen | 51 | 0 | 3 | 48 |

## Validation policy

- Every Tier B/C URL returned HTTP 200, `application/pdf`, `%PDF` at byte zero, and more than 50 KB.
- Every Tier B/C row records the downloaded byte SHA-256 and an extracted maintenance section title.
- Tier C is limited to the approved StartMyCar/OpinAutos mirror hosts and records mirror provenance in `notes`.
- NHTSA TSB/recall PDFs, erWin metadata pages, portal landing pages, and documents without confirmed YMM plus maintenance text remain Tier D.
- A hybrid/PHEV-qualified mirror is not applied unless the target model, trim, or powertrain confirms that qualifier.
- Every reused document records its first validated pack in `manual_share_applied` and `shared_from_pack_id`, including documented annual all-model booklets.
