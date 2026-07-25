# ADR-011 — Import enrichment, assistant review, and shop location memory

**Status:** Accepted (2026-07-25)  
**Deciders:** Product / architecture  
**Related:** ADR-009 (PDF record import) · ADR-010 (deterministic service matching) · [`record-import-data-pipeline.md`](../../../workspace/strategy/record-import-data-pipeline.md) · [`phase-1-intelligence-scope.md`](../../../workspace/strategy/phase-1-intelligence-scope.md) · IMP-11 in [`task-queue.md`](../../../workspace/strategy/task-queue.md)

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
| Shop lookup when cache misses | **Places API first** (structured city/state + place_id) · LLM disambiguation only with owner confirm |
| Domain commit | **Never LLM** — same rule as ADR-009 and ADR-010 |
| Is “Assistant helps review” its own feature? | **Yes — IMP-11** — spans enrichment, tiering, UX, and verification queue |

**One sentence:** The assistant does deterministic cleanup and enrichment on every import; the owner confirms a summary and fixes only what the assistant flags — LLM is quarantined to messy extract and optional disambiguation, never to schedule truth or silent writes.

---

## Part 1 — Shop location memory (recommended stack)

Resolve shop → city/state using the **cheapest reliable source first**:

```text
1. Explicit value on row          PDF extract or owner edit
2. Per-owner confirmed memory     OwnerContextMemory.shopLocations["metrowest acura"] = "Framingham, MA"
3. Creator curated map            infer-shop-location.ts + published Shop Pack (zero marginal cost)
4. Deterministic Places API       Google Places / OSM Nominatim → { city, state, placeId } — rate-limited
5. LLM disambiguation (optional)  "MetroWest Acura" × 3 cities → propose one · owner confirms
6. Never                          Silent write from LLM alone
```

| Layer | Cost to VehicleOS | Reproducible? | When |
|-------|-------------------|---------------|------|
| Curated map | $0 | Yes | Known dogfood / early-access shops |
| Owner memory | $0 | Yes | After first owner confirm for that shop on that vehicle |
| Places API | ~$0.01/lookup | Yes (cached by place_id) | Cache miss on a shop that matters (dealer visit) |
| LLM | Per token | No | Only when Places returns multiple plausible matches |

### Why not a shared “central LLM cache” the team pays for on every import?

| Concern | Rationale |
|---------|-----------|
| **Cost** | Every import would re-query for “Costco Tire Center” — wasteful when a static map suffices |
| **Privacy** | Shop visits are owner behavior; cross-user cache blurs tenancy |
| **Stale data** | Dealerships move; curated + owner-confirmed beats probabilistic memory |
| **Phase 1 scope** | [`phase-1-intelligence-scope.md`](../../../workspace/strategy/phase-1-intelligence-scope.md) allows **per-owner memory**, not cross-user learning |

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

**Rule:** If the decision affects **what gets written to the event store** or **which OEM row gets a baseline**, it must be **deterministic or owner-verified**. LLM may **propose**; it may not **commit**.

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
| **C — Verify** | Unknown shop · mileage/date regression · Places/LLM low confidence · profile conflict (VIN) | One card in **Owner verification** queue | Propose; wait for confirm |
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
| External lookup | Places API port, cache by place_id (P2) |
| Verification | Reuse Now queue for Tier C (P3) |
| LLM extract edge | Pairs IMP-7 when rules fail |

**LLM or not?** Mostly **no**. IMP-11 is primarily **deterministic product intelligence**. LLM appears only at the **extract edge** (IMP-7) and optional **shop disambiguation** (propose + confirm).

---

## Part 7 — Internet search / Places API vs LLM agent

For “MetroWest Acura → Framingham, MA”:

```text
❌ LLM browsing on every import     → expensive, non-reproducible, hard to cache
✅ Curated map entry                → $0, instant (dogfood shops)
✅ Places API text search           → structured { city, state, placeId } · cache per placeId
⚠️ LLM disambiguation              → only if Places returns 3+ plausible matches · owner picks
```

**Places API** returns structured geo data suitable for caching and tests. **LLM web agent** is a last resort for ambiguous names — output is a **proposal** in Tier C, not a silent PATCH to the vehicle record.

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

- **BUILD:** IMP-11 tracked in [`task-queue.md`](../../../workspace/strategy/task-queue.md) — P0 ✅, P1–P3 queued.
- **Domain:** New import modules `enrich-vehicleos-import`, `normalize-carfax-line-items`; extend `infer-shop-location` via Shop Pack over time.
- **UX:** P1 replaces wide review table with card summary + exception list.
- **Memory:** P2 writes confirmed shops to `OwnerContextMemory` — compounds per owner, not cross-user.
- **Interview:** “Assistant cleans CARFAX imports deterministically; LLM only when PDF rules break; owner confirms exceptions; domain writes are always auditable.”

---

## Interview cheat sheet

| Question | Answer |
|----------|--------|
| Why deterministic first? | Service history = schedule truth; must be reproducible, testable, explainable |
| When LLM? | Iff rules extract fails OR optional shop disambiguation — schema-bound, owner-gated |
| Shop memory? | Per-owner after confirm + creator map — not shared LLM cache |
| Meaningful line items? | Denylist at runtime; creator expands offline — not LLM per row |
| Places vs LLM? | Places API for structured geo; LLM only to disambiguate, never silent write |
| Why IMP-11 as a feature? | Enrichment + tiering + UX + memory + verification — not a single function |

---

## Related

- [`record-import-data-pipeline.md`](../../../workspace/strategy/record-import-data-pipeline.md) — three-layer ETL + human gate
- [`phase-1-intelligence-scope.md`](../../../workspace/strategy/phase-1-intelligence-scope.md) — per-owner memory IN, cross-user OUT
- ADR-010 — alias ontology for line item → OEM matching (separate from display noise strip)
