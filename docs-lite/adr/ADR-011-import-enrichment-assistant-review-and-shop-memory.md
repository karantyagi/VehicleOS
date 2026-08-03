# ADR-011 — Import enrichment, assistant review, and shop location memory

**Status:** Accepted (2026-07-25) · Amended (2026-08-02)
**Deciders:** Product / architecture  
**Related:** ADR-009 (PDF record import) · ADR-010 (deterministic service matching) · ADR-012 (product catalog vs owner runtime). Internal planning sources summarized by this ADR: `record-import-data-pipeline.md`, `phase-1-intelligence-scope.md`, and IMP-11 in `task-queue.md`.

---

## Context

CARFAX dogfood on the TLX surfaced three gaps in the **Record import** review funnel (ADR-009):

1. **Shop location empty** — Dogfood JSON loaded Layer 2 directly and skipped `resolveShopLocation()`. PDF extract path enriched location; JSON paste did not.
2. **Boilerplate line items** — CARFAX rows include noise (“Vehicle serviced”, “Maintenance inspection completed”, “Vehicle washed/detailed”) alongside signal (“Oil and filter changed”, “Front brake pads replaced”). Owners should not audit noise row-by-row.
3. **Review UX mismatch** — A wide editable table with horizontal scroll is a **developer/debug surface**, not an owner surface. Service history is **truth**; owners should spend seconds confirming exceptions, not minutes editing spreadsheets.

This ADR locks **how the assistant enriches import drafts before commit**, **where shop location memory lives**, **when LLM is allowed**, and **how much review owners must do**.

---

## Decision summary

| Question | Decision |
|----------|----------|
| Who reviews import rows? | **Assistant first** (deterministic enrichment) · **Owner only for exceptions** (Tier C/D) |
| Shop location memory | **Per-owner confirmed directory** + **creator curated map** — not a shared LLM cache |
| Meaningful vs noise line items | **Deterministic denylist + alias ontology** (ADR-010 pattern) — not runtime LLM |
| Shop lookup when cache misses | **Geoapify only** (structured city/state + place_id) · owner resolves uncertainty manually |
| Domain commit | **Never LLM** — same rule as ADR-009 and ADR-010 |
| Is “Assistant helps review” its own feature? | **Yes — IMP-11** — spans enrichment, tiering, UX, and verification queue |

**One sentence:** The assistant does deterministic cleanup and enrichment on every import; the owner confirms a summary and fixes only what the assistant flags — LLM is quarantined to messy extract, never to shop-location decisions, schedule truth, or silent writes.

---

## Part 1 — Shop location memory (recommended stack)

Resolve shop → city/state using the **cheapest reliable source first**:

```text
1. Explicit value on row          PDF extract or owner edit
2. Per-owner confirmed memory     OwnerContextMemory.shopLocations["metrowest acura"] = "Framingham, MA"
3. Creator curated map            infer-shop-location.ts + published Shop Pack (zero marginal cost)
4. Geoapify lookup                { city, state, placeId } → one candidate fills; several become owner choices
5. Manual owner entry             City, ST → remembered after import confirm
```

| Layer | Cost to VehicleOS | Reproducible? | When |
|-------|-------------------|---------------|------|
| Curated map | $0 | Yes | Known dogfood / early-access shops |
| Owner memory | $0 | Yes | After first owner confirm for that shop on that vehicle |
| Geoapify | Within configured provider quota | Yes (attribution retained) | Cache miss on a shop that matters (dealer visit) |
| Manual entry | $0 | Yes | Geoapify has no safe single result or is unavailable |

### Single-provider boundary

- Geoapify is the only production shop-location provider. Nominatim and a runtime provider fallback are intentionally absent: conflicting answers and availability plumbing are not worth the complexity for an optional import enrichment.
- `GEOAPIFY_API_KEY` stays server-side. If it is absent, or Geoapify has no safe single result, the owner keeps the editable `City, ST` field and the import remains reviewable.
- The app retains a confirmed location in the owner directory only after import confirmation and keeps the required Geoapify/OpenStreetMap attribution in the product trust surface.
- There is no LLM shop search or ranking step. Manual owner choice is the recovery path.
- A production-only deployed canary makes one fixed, non-owner Geoapify request after each Vercel owner-app deployment. Its separate bearer token proves the Vercel runtime has the configured server key without exposing it; a failure is an operational signal, not a release gate, because manual owner entry remains safe recovery.

### Why not a shared “central LLM cache” the team pays for on every import?

| Concern | Rationale |
|---------|-----------|
| **Cost** | Every import would re-query for “Costco Tire Center” — wasteful when a static map suffices |
| **Privacy** | Shop visits are owner behavior; cross-user cache blurs tenancy |
| **Stale data** | Dealerships move; curated + owner-confirmed beats probabilistic memory |
| **Phase 1 scope** | The internal `phase-1-intelligence-scope.md` plan allows **per-owner memory**, not cross-user learning |

**Product data vs product work:**

- **Product data** — Curated Shop Pack rows, denylist phrases, alias ontology: creator-maintained, versioned, shipped with the repo (like Schedule Packs in ADR-010).
- **Product work (runtime)** — Enrichment functions read that data + owner memory; no LLM required for the happy path.

---

## Part 2 — Why deterministic first, not LLM

Service history feeds **schedule baselines** (ADR-010). Wrong enrichment → wrong due dates → wrong reminders → trust failure.

| Property | Deterministic enrichment | Runtime LLM per row |
|----------|-------------------------|---------------------|
| Same input → same output | Yes | No (model/temperature drift) |
| Unit tests + fixtures | Yes | Flaky |
| Owner explainability | “Matched shop pack / your saved location” | “The model thought…” |
| Cost at 30 rows × N users | $0 | Unbounded |
| Hot path | Runs once at import review | Would run on every review |

**Rule:** If the decision affects **what gets written to the event store** or **which OEM row gets a baseline**, it must be **deterministic or owner-verified**. Shop lookup has no LLM step; the owner confirms any proposed location.

---

## Part 3 — When to use LLM (iff and only when)

Use LLM **if and only if** all of the following hold:

1. **Rules + schema validation failed** or confidence is below threshold on Layer 1 extract (IMP-7 / ENG-2).
2. **Output is constrained** — must validate against Extract v1 / Import v1 JSON schema before the owner sees it.
3. **No direct domain write** — mapper + owner confirm (or verification queue) still required.
4. **Low-confidence fields are flagged** in review UI — never silently promoted to commit.

**Do not use LLM for:**

| Task | Use instead |
|------|-------------|
| Decide meaningful vs noise line items | `normalizeCarfaxLineItems()` denylist (runtime) · creator expands denylist offline |
| Match line item → OEM schedule row | Alias ontology (ADR-010) |
| Fill shop location when curated map + owner memory hit | Already resolved — no call needed |
| Resolve an unknown shop location | Geoapify or owner-entered City, ST — never an LLM guess |
| Append `service.recorded` events | `recordVehicleOsImport` — never calls LLM |
| Dedup / conflict detection | Domain functions (IMP-10, VERIFY_* tasks) |

**Offline LLM is OK:** Creator runs LLM over sample CARFAX exports to **propose** new denylist entries or shop pack rows → human QA → merge to product data. That is **knowledge factory**, not **owner hot path**.

---

## Part 4 — Line items: meaningful vs noise

CARFAX copies the same boilerplate on most dealer visits. For **display and schedule signal**, keep maintenance content; strip noise.

| Bucket | Examples | Runtime action |
|--------|----------|----------------|
| **Signal** | Oil and filter changed, Front brake pads replaced, Tires rotated | Save + show + feed alias matching |
| **Noise** | Vehicle serviced, Maintenance inspection completed, Vehicle washed/detailed | Strip before display/commit |
| **Context** | Passed safety inspection, Passed emissions inspection | Keep when no signal lines remain |

If a row is noise-only after strip → fallback **`Service visit`** so date + mileage + shop timeline anchor is preserved.

**Why not LLM per row to classify?** Non-reproducible, hard to regression-test, and CARFAX boilerplate is **finite** — maintain a denylist like OEM aliases. New portal phrases → creator QA → extend denylist.

**Code (P0 shipped):** `packages/domain/src/import/normalize-carfax-line-items.ts`

---

## Part 5 — How much should the assistant auto-handle? (trust tiers)

Do **not** fully abstract review away. Service history is the **system of record**. Silent wrong imports are worse than a short owner checkpoint.

| Tier | Criteria | Owner action | Assistant action |
|------|----------|--------------|------------------|
| **A — Auto** | Date + mileage parse clean · shop recognized · lines normalized · dedupe pass · no regression | None — included in bulk confirm | Enrich + mark ready |
| **B — Enriched** | Location from map/memory · noise stripped · aliases resolved | Summary only (“28 visits ready”) | Same + show what was cleaned |
| **C — Verify** | Unknown shop · mileage/date regression · Geoapify has no safe single result · profile conflict (VIN) · **likely source duplicate (IMP-12)** | One card in **Owner verification** queue | Propose; wait for confirm |
| **D — Block** | Unparseable row · conflicting duplicate · extract failure | Exclude + explicit warning | Do not commit |

**Target:** ≥90% of rows Tier A/B on a clean CARFAX PDF like TLX dogfood. Owner experience:

> “Assistant imported 28 visits. 2 things need your OK.”

Not: “Here’s a spreadsheet.”

---

## Part 6 — Why “Assistant helps review” is its own feature (IMP-11)

It is **not** a one-line filter in the import handler. It spans:

| Concern | IMP-11 scope |
|---------|--------------|
| Enrichment pipeline | Location resolve, line normalize, JSON/PDF/commit parity |
| Trust tiering | Classify rows A/B/C/D before UI |
| Review UX | Card-based summary, exception list — replace horizontal table (P1) |
| Memory write path | Owner confirm → `OwnerContextMemory` shop directory (P2) |
| External lookup | Geoapify port, owner confirmation, and required attribution (P2) |
| Verification | Reuse Now queue for Tier C (P3) |
| LLM extract edge | Pairs IMP-7 when rules fail |

**LLM or not?** Mostly **no**. IMP-11 is primarily **deterministic product intelligence**. LLM appears only at the **extract edge** (IMP-7), never for shop-location disambiguation.

---

## Part 10 — CARFAX source reconciliation (IMP-12 · narrow v0)

**Status:** A conservative historical-review slice is implemented. Broader fuzzy reconciliation remains deferred until multi-user QA fixtures exist.

**Distinct from Part 4 noise:** CARFAX can show the **same real-world visit twice** through different channels:

```text
Dealer DMS ──► CARFAX backend feed ──► "MetroWest Acura · inspection"
Owner app  ──► CARFAX self-report   ──► "Self Reported · oil change"
                         │
            Same visit · different shop label · 0–15 day lag · ±mileage
```

IMP-10 dedupes a repeated **visit** (`date + normalized shop`). IMP-11 handles **boilerplate** and **same-day odometer noise**. The historical-review slice presents a prominent strong signal for an exact adjacent-day, same-mileage overlap, and a quieter possible signal for compatible owner/external or same-shop records with similar work within 10 days and an adaptive 100–500 mile band. Both require owner confirmation to merge.

**Principle:** Detect likely duplicates · never silent merge · owner chooses · deterministic rules only.

| Signal (initial — tune with fixtures) | Example | Action |
|----------------------------------------|---------|--------|
| Same mileage + 0–1 day + identical normalized line item | Dealer oil change + owner oil-change note | Historical “Possible duplicate” review |
| Same day + inspection lines + different shops | MA state + dealer inspection | Tier C verify |
| ±14 days + overlapping line items + Self Reported vs dealer | Owner pre-log + late dealer feed | Tier C verify |
| Re-import fuzzy match vs timeline | 2nd CARFAX pull adds dealer row | Verify on re-import |

**Owner resolution (v0):** The assistant prepares one merged record and, when only one record is evidence-backed (`receipt`, `dealer`, or `CARFAX`), preselects that record's details; otherwise it selects the earlier record. The owner can switch the retained date/shop with one tap, drag work items to reorder, remove unwanted items, or optionally type a missing item. VehicleOS combines evidence, retains a useful non-zero total, and records an owner-confirmed `service.merged` event. Original source events remain in the audit log.

**Automation boundary:** Exact repeated imports may still be skipped automatically before a duplicate timeline row is committed. Cross-source historical records are proposed and composed automatically, but require one owner confirmation to merge. Do not auto-merge these until the product has calibrated multi-user fixtures and a clear undo/unmerge path.

**Why the broader rules still wait:** Single-car dogfood cannot validate ±14-day or semantic matching safely. Early onboard users + annotated fixtures in `connectors/carfax-connect/examples/` are the promotion gate. See IMP-12 in the internal `task-queue.md`.

**Explicit non-goals until proven:** auto-collapse without owner tap · runtime LLM same-visit classifier · block entire import for unresolved suspects.

---

## Part 7 — Geoapify location lookup, not an LLM agent

For “MetroWest Acura → Framingham, MA”:

```text
❌ LLM browsing on every import     → expensive and non-reproducible
❌ External-provider fallback chain  → conflicting answers and avoidable operational complexity
✅ Curated map entry                → $0, instant (dogfood shops)
✅ Geoapify lookup                  → structured { city, state, placeId } on a server-only key
✅ Manual City, ST                  → the recovery path when there is no safe single result
```

**Geoapify** returns structured geo data suitable for deterministic tests and owner review. Its key stays server-side; retained results keep the required provider/data attribution. There is no runtime LLM or second location provider.

---

## Part 8 — Architecture (enrichment before commit)

```text
PDF or JSON ingest
  → Layer 1 extract (rules; LLM only if rules fail — IMP-7)
  → Layer 2 map (deterministic)
  → enrichVehicleOsImport()          ← ADR-011 P0
       · resolveShopLocation()
       · normalizeCarfaxLineItems()
  → tierImportRows()                 ← IMP-11 P1
  → Review UI (summary + exceptions) ← IMP-11 P1
  → Owner confirm / verification
  → recordVehicleOsImport()          ← never LLM
  → projections (timeline, schedule)
```

**Invariant (unchanged from ADR-009):** Non-determinism is quarantined to **messy text → Layer 1 JSON**. Everything after validated Import v1 + owner gate is deterministic.

**P0 code paths (shipped):**

| Path | Enrichment |
|------|------------|
| PDF extract → mapper | `mapCarfaxExtractToImport` |
| JSON paste / dogfood load | `parseVehicleOsImportJson` · `applyCarfaxDraft` |
| Import confirm API | `enrichVehicleOsImportService` safety net |
| Fixtures | `tlx-carfax-history.v1.json` backfilled with `shopLocation` + normalized lines |

---

## Part 9 — Knowledge compounding, who adds rows, new-user path

The internal `feature-readiness-gate.md` supplies the mandatory dogfood vs new-user checklist summarized below.

### The curated pack is dogfood bootstrap — not production scale

The **Shop Pack** ships ~5 Boston-area dealer mappings for TLX dogfood. That is **Plane A product data** maintained offline by the creator — not how arbitrary new users get nationwide coverage.

### Who adds shop location rows, and how

| Source | Who | When | Where stored | Plane |
|--------|-----|------|--------------|-------|
| **Explicit on row** | PDF extract or owner edit | Import review | On service row | B |
| **Owner confirmed memory** | Owner | After import confirm | `OwnerContextMemory.shopLocations` | B |
| **Creator Shop Pack** | Creator offline (factory) | QA on sample CARFAX | `shop-pack.v1.json` | A |
| **Geoapify lookup** | System (server) | Cache miss on dealer shop | Proposed → owner memory after confirm | B |
| **Runtime auto-expand pack** | **Never** | — | — | — |

### How knowledge improves over time (per owner)

```text
Import 1 (new user, ~30 CARFAX rows)
  → Row has address from PDF: auto
  → Shop in owner memory: auto
  → Shop in creator pack (dogfood): auto
  → Unknown dealer: Geoapify server lookup proposes city/state
  → Still miss or multiple cities: Tier C — owner adds or selects "City, ST" once → memory grows

Import 2 (same user)
  → Known shops: auto from owner memory
  → Only net-new shops hit lookup or review
```

**Per-owner memory compounds. Cross-user shop cache is OUT of Phase 1.**

### Interview line (shop locations)

> “We don’t ship a 10,000-row shop database. We ship a resolution ladder: explicit row data, per-owner confirmed memory, a small creator seed pack for dogfood, then one Geoapify lookup on cache miss. If it cannot safely resolve the shop, the owner adds City, ST once. Second import is easier because memory compounds per owner.”

---

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Owner reviews every row in editable table | High friction; wrong UX for 30+ row CARFAX history |
| LLM classifies meaningful vs noise at runtime | Non-reproducible; untestable; cost on every import |
| Shared team-wide LLM shop cache | Cost, privacy, stale data; violates Phase 1 memory boundary |
| Skip location entirely | Loses “where” context for reminders and owner story |
| Auto-commit all rows without tiers | Truth layer risk; conflicts and regressions need verification |
| Full LLM web agent for every unknown shop | Expensive; structured Places API suffices for 95% cases |

---

## Consequences

- **BUILD:** IMP-11 is tracked in the internal `task-queue.md` — P0 ✅, P1–P3 queued.
- **Domain:** New import modules `enrich-vehicleos-import`, `normalize-carfax-line-items`; extend `infer-shop-location` via Shop Pack over time.
- **UX:** P1 replaces wide review table with card summary + exception list.
- **Memory:** P2 writes confirmed shops to `OwnerContextMemory` — compounds per owner, not cross-user.
- **Interview:** “Assistant cleans CARFAX imports deterministically; LLM only when PDF rules break; owner confirms exceptions; domain writes are always auditable.”

---

## Interview cheat sheet

| Question | Answer |
|----------|--------|
| Why deterministic first? | Service history = schedule truth; must be reproducible, testable, explainable |
| When LLM? | Only when rules-based PDF extraction fails — never for shop locations |
| Shop memory? | Per-owner after confirm + creator map — not shared LLM cache |
| Meaningful line items? | Denylist at runtime; creator expands offline — not LLM per row |
| Places vs LLM? | Geoapify only for structured geo; manual owner entry handles uncertainty |
| Why only ~5 shops in pack? | Dogfood bootstrap (Plane A factory) — new users use Geoapify + owner memory |
| Who adds pack rows? | Creator offline factory — not runtime assistant |
| How does knowledge improve? | Per-owner `shopLocations` compounds; 2nd import easier than 1st |
| Why IMP-11 as a feature? | Enrichment + tiering + UX + memory + verification — not a single function |
| Source duplicates (dealer vs Self Reported)? | Narrow v0 detects same-mileage, adjacent-day, identical-line overlap and lets the owner choose; broader fuzzy rules still need multi-user fixtures |

---

## Related

- Internal `record-import-data-pipeline.md` — three-layer ETL + human gate
- Internal `phase-1-intelligence-scope.md` — per-owner memory IN, cross-user OUT
- ADR-010 — alias ontology for line item → OEM matching (separate from display noise strip)
