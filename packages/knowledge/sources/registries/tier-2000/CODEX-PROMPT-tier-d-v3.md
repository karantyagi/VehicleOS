# Codex prompt — Tier D PDF re-discovery (913 packs → v3 registry)

**Branch:** `feat/tier2000-in-review-source-v2`  
**Run in Codex** from latest commit. Attach the input CSVs listed below.

---

## One-line task

Find **byte-validated** US-market OEM maintenance PDFs for **913 Tier D VehicleOS packs** and write `tier-2000-oem-manual-sources-v3.csv`.

---

## Attach these input files

| File | Purpose |
|------|---------|
| `tier-2000-tier-d-retry.csv` | **913 pack_ids** to research (priority-sorted, includes `oem_family`, `manual_share_policy`, prior `v1_blocked_reason`) |
| `tier-2000-pack-targets.csv` | Full identity + luxury manual-share policies for cross-reference |
| `tier-2000-oem-manual-sources.csv` | v1 baseline — do not overwrite; v3 is a patch file |
| `tier-2000-oem-manual-sources-v2.csv` | in-review retry (469 packs) — **already merged separately; do not duplicate those rows in v3** |

**Output (required):** `tier-2000-oem-manual-sources-v3.csv` — **exactly one row per `pack_id` in `tier-2000-tier-d-retry.csv` (913 rows, no extras, no omissions)**

Optional: `tier-2000-oem-manual-sources-v3-summary.md` with counts by tier and make.

---

## Truth policy (non-negotiable)

VehicleOS **does not** promote packs from URL trust alone. Your job is **honest source discovery + byte validation**. Factory dual-extract runs after merge; false positives waste pipeline time.

| Tier | Assign only when |
|------|------------------|
| **B** | OEM-hosted PDF; correct US YMM/generation; **complete maintenance section** confirmed in PDF text; HTTP 200 + `application/pdf` + `%PDF` magic + size **> 50 KB**; SHA-256 recorded |
| **C** | Non-OEM mirror with **attributable OEM publisher identity** (e.g. StartMyCar/OpinAutos byte-match to owners.kia.com); same validation as B |
| **D** | Any failure: 404, auth wall, wrong generation, cover-only manual, **no extractable maintenance schedule**, TSB/recall bulletin, portal-only HTML, or unverified applicability |

**Never assign Tier B/C for:**
- NHTSA TSB / recall bulletins (caused dual-extract mismatch on Audi v2)
- Warranty-only booklets with no maintenance intervals
- Owner portal landing pages (not direct PDF)
- Documents you did not download and inspect

**Tier D is success** when documented honestly in `blocked_reason`. Target ~40–60% Tier D for hard OEMs (Mercedes, Tesla, HMG portal).

---

## Source acquisition order (per pack)

1. **OEM official portal** — preferred
2. **OEM CDN / static PDF** — e.g. `owners.honda.com/static/pdfs/...`, `fordservicecontent.com`
3. **Reputable manual aggregator** — only after OEM fails; Tier C only; record mirror host + original OEM attribution in `notes`
4. **Tier D** — record specific failure

Do **not** use manualslib / scribd / random upload sites unless they redirect to an official OEM asset.

---

## Batch priority (process in this order)

Process **25 packs per batch**, output partial v3 CSV after each batch.

| Batch | Makes | ~Count | Strategy |
|-------|-------|--------|----------|
| 1 | Honda + Acura | 66 | Known MM pattern: `owners.honda.com/static/pdfs/{YEAR}/{Model}/...Maintenance_Minder...` |
| 2 | Ford (ICE) + Chevy + Buick | 110 | `fordservicecontent.com`, GM `contentdelivery.ext.gm.com` — slug from year/model |
| 3 | Subaru + Mazda + Mitsubishi + Nissan | 87 | Subaru warranty booklet pattern; Mazda owner-manuals CDN |
| 4 | Hyundai + Kia + Genesis | 237 | HMG portals session-gated — try **StartMyCar/OpinAutos byte mirrors** (Tier C) if OEM 403; see existing Kia mirrors in factory |
| 5 | Mercedes-Benz | 148 | `owners.mbusa.com` / `mercedes-benz.com/en/owners/manuals` — Assyst Plus **maintenance booklet**; generation sharing per `manual_share_policy` |
| 6 | Audi | 77 | **NOT erWin-gated-only metadata**; **NOT NHTSA TSBs**; audiusa.com literature or complete owner manual with scheduled maintenance table |
| 7 | VW (+ EV) | 51 | `ownersliterature.vw.com` document API IDs |
| 8 | Lexus + Genesis luxury | 60 | Toyota SIPB pattern for Lexus; genesisowners.com |
| 9 | Chrysler + Jeep | 36 | Stellantis owner portal PDFs |
| 10 | Toyota gaps | 17 | SIPB `assets.sipb.toyota.com/.../T-MMS-...` |
| 11 | Tesla + BMW EV + ev-generic | ~34 | Tesla: likely **all Tier D** (app-only intervals) — document honestly |
| 12 | Residual luxury EV | 6 | BMW i4/i5/iX portal-only cases |

---

## Luxury manual sharing (from pack-targets `manual_share_policy`)

Same rules as v1 — do **not** reject because PDF cover says "330i" and pack is "M340i". Verify **maintenance section identity** across trims.

| Policy | Action |
|--------|--------|
| `shared_g20_generation` | One BMW 3 Series G20 manual per MY |
| `shared_w205_w206_generation` | W205 vs W206 separate |
| `shared_b9_generation` | Audi A4 B9 platform manual |
| `shared_within_model_year` | One PDF for all trims that year |

Set `manual_share_applied=yes` and `shared_from_pack_id` when sharing.

---

## OEM-specific hints

### Mercedes (148 — 0% in v1)
- Search: `"Mercedes-Benz" "{year}" "{model}" "Assyst Plus" OR "Service Booklet" filetype:pdf`
- Portal: `https://www.mbusa.com/en/owners/manuals`
- Accept maintenance booklet with Assyst Plus menu + max intervals

### Hyundai / Kia / Genesis (237 — 0% in v1)
- OEM: `owners.hyundaiusa.com`, `owners.kia.com` (KGIS session-gated)
- **Tier C mirrors** (verify SHA-256): `manuals.startmycar.com/published/Kia-...`, `manuals.opinautos.com/published/Kia-...`
- Factory already verified 4 Kia mirrors — extend pattern to Sportage/Tucson/Santa Fe/Genesis

### Audi (77 Tier D + 102 demoted from TSB in v2)
- **Banned:** NHTSA TSB PDFs, erWin metadata-only pages
- Try: `audiusa.com/us/web/en/owners/literature.html`, warranty & maintenance booklet

### Ford (58)
- Pattern: `fordservicecontent.com/Ford_Content/Catalog/owner_information/{year}_Ford_{Model}_Owners_Manual_...pdf`

### VW (51)
- `ownersliterature.vw.com/owners-literature-service/v1/document/{uuid}`

### Tesla (28)
- Likely no public maintenance PDF — Tier D with `blocked_reason`: "Tesla service intervals app-only; no OEM maintenance PDF published"

---

## Output CSV schema (24 columns, exact header)

```text
priority,pack_id,year,make,model,trim,powertrain,segment,oem_family,schedule_kind,source_tier,primary_pdf_url,alternate_pdf_urls,manual_type,maintenance_section_title,manual_share_applied,shared_from_pack_id,estimated_pdf_pages,http_status,content_type,sha256_if_downloaded,confidence,notes,blocked_reason
```

- `alternate_pdf_urls`: pipe-separated `|`
- `confidence`: 0.90–0.98 exact manual; 0.80–0.90 generation-shared; max 0.75 adjacent MY
- `notes`: include validation proof — `"v3 retry validation passed YYYY-MM-DD: HTTP 200, application/pdf, %PDF magic, {bytes} bytes, SHA-256 {hash}"`
- Copy `priority`, `segment`, `oem_family`, `schedule_kind` from input/targets

---

## Validation checklist (every Tier B/C row)

- [ ] Downloaded PDF bytes locally
- [ ] HTTP 200 at fetch time
- [ ] `%PDF` magic at offset 0
- [ ] Size > 50 KB
- [ ] SHA-256 computed and recorded
- [ ] Maintenance section located (page range or section title in `maintenance_section_title`)
- [ ] YMM/generation applicability confirmed in document text
- [ ] Not a TSB/recall/warranty-only doc

---

## Success criteria

| Metric | Target |
|--------|--------|
| Row count | **913** (exact match to tier-d-retry.csv) |
| New Tier B | ≥ 250 (Honda/Ford/Chevy/HMG mirrors realistic) |
| New Tier C | ≥ 100 (Kia/Hyundai/Genesis mirrors) |
| Honest Tier D | Remainder with specific `blocked_reason` |
| False Tier B | **0** (no URL-only promotion) |

---

## After Codex completes (Terminal.app — not Cursor)

```bash
cd ~/Interview\ Prep/rounds/02-applied-ai/projects/vehicle-os/repos/VehicleOS

git checkout feat/tier2000-in-review-source-v2
git pull   # if pushed
# commit v3 CSV + summary from Codex

cd packages/knowledge
pnpm build:tier2000:pdf-overrides
pnpm verify:tier-d --promote
pnpm test
```

Factory promotes **only** when dual-extract agrees + QA passes (Option A).

---

## Start command for Codex

```
Read CODEX-PROMPT-tier-d-v3.md and tier-2000-tier-d-retry.csv in
packages/knowledge/sources/registries/tier-2000/.

Produce tier-2000-oem-manual-sources-v3.csv (913 rows) following the truth
policy. Process Batch 1 (Honda + Acura, 66 packs) first and show results
before continuing.
```
