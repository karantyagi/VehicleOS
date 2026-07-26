# ADR-010 — Deterministic service matching & curated OEM knowledge packs

**Status:** Accepted (2026-07-25)  
**Amended:** 2026-07-26 — verified aggregator and mirror fallback for manual discovery<br>
**Deciders:** Product / architecture  
**Related:** ADR-007 (manual upload) · ADR-009 (record import) · **ADR-011** (import enrichment + shop memory) · [`phase-1-intelligence-scope.md`](../../../workspace/strategy/phase-1-intelligence-scope.md) · [`record-import-data-pipeline.md`](../../../workspace/strategy/record-import-data-pipeline.md) · [`assistant-reminder-decision-engine.md`](../../../workspace/strategy/assistant-reminder-decision-engine.md)

---

## Context

Dogfood today uses one OEM manual family (Acura TLX). CARFAX import surfaced a real gap: line item **“Oil and filter changed”** did not match OEM row **“Replace engine oil and filter (Maintenance Minder B)”**, so schedule baseline was wrong and a false overdue reminder appeared.

The fix was deterministic pattern matching — not an LLM call. That raised a product question:

> As we add Toyota Camry, Hyundai Elantra, and hundreds more vehicles, will regex whack-a-mole make the product fragile? Should `matchServiceName` become embeddings / LLM? Should we pre-extract manuals for a supported-car dropdown so owners never touch OEM PDFs?

This ADR locks **how schedule truth and service semantics scale** without nondeterminism on the hot path.

---

## Decision summary

| Layer | Approach |
|-------|----------|
| **Schedule due dates & baselines** | Always **deterministic** — never LLM at read/projection time |
| **Service line → OEM row matching** | **Canonical service IDs + alias ontology** — deterministic lookup, tested fixtures |
| **OEM interval data** | **Curated Schedule Packs** per supported YMM — creator-maintained, versioned |
| **Manual PDF / LLM** | **Offline creator pipeline only** — proposes pack rows; human QA before publish |
| **Manual source discovery** | **OEM first, verified aggregator/mirror fallback** — provider finds candidates; VehicleOS validates the document |
| **Unsupported vehicle** | Explicit fallback — upload manual or generic intervals; no fake “supported” |
| **Owner-specific learning** | **Verification + confirmed aliases** — optional; never silent auto-write to schedule truth |

**One sentence:** LLM helps creators *build* the knowledge base offline; owners get deterministic schedule truth from curated packs plus auditable alias matching.

---

## Part 1 — Why hot-path matching stays deterministic

### What went wrong (TLX / CARFAX)

This was a **taxonomy gap**, not a semantic-understanding gap. Humans map “Oil and filter changed” → Maintenance Minder B instantly. So should a maintained alias table.

### Why not LLM or embeddings on `findLastMatchingService`

| Risk | Impact |
|------|--------|
| Silent false positive | Wrong baseline → false “all clear” or false overdue |
| Non-reproducible | Same vehicle, different due dates after model deploy |
| No owner explainability | “Similarity 0.82” is not a trust surface |
| Hot-path cost | Schedule projection runs on every state change |
| Test gap | Hard to regression-test probabilistic matching |

### Where intelligence *is* allowed

Aligned with Phase 1 intelligence scope:

```text
Messy ingest (PDF, receipt OCR)     → LLM/stub PROPOSE structured rows
Owner review / verification         → Human gate
Domain events + schedule projection → DETERMINISTIC
Reminder copy (why / tone)          → LLM ok — must not change due date
```

**Rule:** If it touches the event store or changes *when* something is due → deterministic + tests.

Embeddings may **suggest** a match in a verification UI (“We think this is Code B — confirm?”). They must **not** auto-commit baselines.

---

## Part 2 — How semantics scale (not one regex per bug)

Two separate artifacts. Do not conflate them.

### A. OEM Schedule Pack (interval truth)

**What:** Curated maintenance schedule for a vehicle family — intervals, OEM service names, maintenance codes, source page citations.

**Example pack key:** `acura-tlx-2015-2020.v1`

**Contents (conceptual):**

```json
{
  "packId": "acura-tlx-2015-2020.v1",
  "make": "Acura",
  "model": "TLX",
  "yearFrom": 2015,
  "yearTo": 2020,
  "manualTitle": "2015–2020 Acura TLX Maintenance Minder",
  "entries": [
    {
      "entryId": "code-b",
      "canonicalServiceId": "acura.mm.b.oil_filter",
      "serviceName": "Replace engine oil and filter (Maintenance Minder B)",
      "intervalMiles": 7500,
      "intervalMonths": 12,
      "sourcePage": "P. 527 — Code B"
    }
  ]
}
```

**On vehicle create (supported YMM):** hydrate pack → emit existing `knowledge.schedule.recorded` domain events (same projection as today). Owner does **not** upload a manual for supported cars.

### B. Service Alias Ontology (line-item matching)

**What:** Maps messy history phrases → `canonicalServiceId` (not free-text OEM names).

**Layers:**

| Layer | Scope | Example |
|-------|-------|---------|
| **Global** | All vehicles | `"Oil and filter changed"` → `generic.oil_filter` |
| **OEM family** | Acura Maintenance Minder | `"Maintenance Minder B"` → `acura.mm.b.oil_filter` |
| **DMS / portal** | CARFAX, dealer systems | `"Lube, oil & filter"` → `generic.oil_filter` |
| **Owner confirmed** | Per vehicle (future) | Owner picks OEM row once → persisted alias |

**Runtime matching (deterministic):**

```text
timeline line item
  → normalize text
  → lookup aliases by canonicalServiceId candidates for this pack
  → first match wins by priority (owner > oem > global)
  → baseline mileage from matched timeline row
```

`match-service-name.ts` evolves into **`resolveServiceBaseline`** backed by alias config — regex becomes one implementation strategy inside the ontology, not the whole system.

### C. Eval fixtures (anti-fragility)

Every alias gap becomes a **permanent test**:

```text
fixtures/service-matching/
  carfax-oil-and-filter-changed.tlx.v1.json   ← 57160 mi → code-b
  toyota-camry-synthetic-oil.v1.json          ← added when pack ships
```

Dogfood failures → fixture → alias → ship. This is the product development loop, not emergency regex.

---

## Part 3 — Curated vehicle catalog (phased, honest)

### Do not launch with “1000 cars” unchecked

A dropdown of 1000 YMMs where 900 were LLM-extracted without QA **is** a fragile product — worse than supporting 30 cars well.

### Recommended rollout tiers

| Tier | Count (target) | QA bar | Owner UX |
|------|----------------|--------|----------|
| **Tier 1 — Launch** | 20–50 YMM | Creator verified + dogfood fixture | Full schedule + import matching |
| **Tier 2 — Expansion** | 50–200 | Spot-check + automated schema validation | Same |
| **Tier 3 — Long tail** | 200–1000+ | Semi-automated extract + sample manual audit | Same |
| **Unsupported** | Everything else | N/A | “Upload manual” or generic mileage reminders |

**Supported list is a product promise.** Only list a YMM after its Schedule Pack + alias smoke tests pass.

### Creator pipeline (your “50 parallel agents” idea — scoped correctly)

```text
┌─────────────────────────────────────────────────────────────┐
│ OFFLINE — Creator / vehicleos-engine (not owner runtime)   │
├─────────────────────────────────────────────────────────────┤
│ 1. Pick YMM from priority list (sales volume, your network) │
│ 2. Discover PDF: OEM first, then source-provider adapters │
│ 3. Extract schedule rows (rules + LLM assist)               │
│ 4. Map to canonicalServiceId + draft alias list             │
│ 5. Human QA (you) — compare to manual pages                 │
│ 6. Commit pack JSON + fixtures + alias entries              │
│ 7. CI: schema validate + matching tests + projection tests  │
│ 8. Seed Postgres reference tables (or ship in repo bundle)  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ RUNTIME — Owner app                                          │
├─────────────────────────────────────────────────────────────┤
│ Pick supported YMM → pack hydrates → CARFAX import matches   │
│ No LLM on schedule fold · No manual upload required          │
└─────────────────────────────────────────────────────────────┘
```

Parallel Cursor sub-agents are **batch workers for step 3–4**, not autonomous publishers. **You** (or QA checklist) gate step 5–8.

Priority list sources: US registration volume, your early-access signups, interview demo needs — not “every trim ever.”

### Manual source discovery and trust policy

VehicleOS does not need to build another global manual search engine.
Reputable manual aggregators and collection portals are valid **discovery and
transport providers**. They do not become authority merely because they host a
file; the PDF itself must prove its identity and applicability.

Discovery order:

1. Query an official OEM owner, warranty, or service source.
2. If the OEM source is missing, session-gated, or unstable, query replaceable
   aggregator/mirror providers.
3. Normalize candidates by document identity and SHA-256 so the same PDF on
   multiple hosts is one evidence object.
4. Validate the document before extraction or pack publication.

| Source tier | Required evidence | Treatment |
|-------------|-------------------|-----------|
| **B — OEM** | OEM-hosted PDF; correct US-market YMM/generation; complete maintenance content; byte checks pass | Preferred source |
| **C — verified mirror** | Reputable non-OEM host; publisher and document identity are attributable to the OEM; the same applicability, completeness, content, and byte checks pass | Valid fallback with mirror provenance |
| **D — blocked** | Wrong or uncertain market/YMM, incomplete document, no applicable maintenance section, failed retrieval, or unverifiable provenance | Do not publish as supported |

Every Tier B/C candidate must pass:

- HTTP 200, `application/pdf`, `%PDF` magic, a meaningful size threshold, and
  SHA-256 capture.
- Cover/title, model year, make/model or generation, powertrain where relevant,
  US-market applicability, edition/document number, and page completeness.
- Inspection of the actual maintenance section. Matching only the cover or
  first pages is insufficient.
- Explicit `manual_share_policy`, `manual_share_applied`, and
  `shared_from_pack_id` provenance when one document covers multiple trims.
- Retrieval date, publisher, host/provider, original URL, mirror URL when
  applicable, and the validation result.

Copyright and site terms are separate from technical validity. A third-party
host may be acceptable for creator-side evidence without granting VehicleOS
permission to redistribute the PDF. Store or republish source bytes only when
the applicable terms allow it; otherwise retain the registry metadata, hash,
citations, and locally controlled QA evidence.

The provider boundary is intentionally small: providers return candidate
documents for a YMM query; the common validator assigns trust and applicability.
Public `VehicleOS` owns the provider contract, provenance schema, validation
methodology, and a representative integration. Private `vehicleos-engine` owns
tuned provider ranking, portal-specific recovery heuristics, and production
scoring weights.

Before adopting an aggregator, run a small bake-off across retry packs and
measure YMM/market correctness, maintenance-section presence, direct-PDF
access, duplicate rate, URL stability, terms/licensing risk, and the percentage
that clears Tier C without manual correction.

---

## Part 4 — Where data lives (storage architecture)

### Hybrid: Git source of truth → Postgres serving layer

| Store | Contents | Why |
|-------|----------|-----|
| **Repo `packages/knowledge/`** | Versioned JSON packs, alias files, JSON Schema, Vitest fixtures | Reviewable PRs, reproducible CI, open-core boundary |
| **Source registries** | Candidate URL, publisher/provider provenance, applicability, validation result, hash | Auditable discovery without making a host the authority |
| **Postgres reference tables** | `supported_vehicles`, `oem_schedule_packs`, `oem_schedule_entries`, `service_aliases` | Fast onboarding dropdown, runtime lookup without redeploy |
| **Supabase Storage** | Source manual PDFs (evidence) | ADR-007 pattern — cite pages in packs |
| **Per-vehicle event store** | `knowledge.schedule.recorded` events (today) | Unchanged — vehicle-specific truth remains event-sourced |

**Postgres is reference/catalog data, not a replacement for domain events.** Hydrating a pack still writes schedule events to the vehicle aggregate so projections stay replayable.

### Sketch schema (reference tables)

```sql
-- Catalog: which YMMs we support
CREATE TABLE supported_vehicles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make          TEXT NOT NULL,
  model         TEXT NOT NULL,
  year_from     INT NOT NULL,
  year_to       INT NOT NULL,
  trim          TEXT,
  pack_id       TEXT NOT NULL REFERENCES oem_schedule_packs (pack_id),
  support_tier  TEXT NOT NULL CHECK (support_tier IN ('tier1', 'tier2', 'tier3')),
  qa_status     TEXT NOT NULL CHECK (qa_status IN ('verified', 'beta', 'deprecated')),
  UNIQUE (make, model, year_from, year_to, COALESCE(trim, ''))
);

CREATE TABLE oem_schedule_packs (
  pack_id       TEXT PRIMARY KEY,
  version       INT NOT NULL,
  manual_title  TEXT NOT NULL,
  manual_storage_key TEXT,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE oem_schedule_entries (
  pack_id               TEXT NOT NULL REFERENCES oem_schedule_packs (pack_id),
  entry_id              TEXT NOT NULL,
  canonical_service_id  TEXT NOT NULL,
  service_name          TEXT NOT NULL,
  interval_miles        INT,
  interval_months       INT,
  source_page           TEXT,
  PRIMARY KEY (pack_id, entry_id)
);

CREATE TABLE service_aliases (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_service_id  TEXT NOT NULL,
  alias                 TEXT NOT NULL,
  match_kind            TEXT NOT NULL CHECK (match_kind IN ('exact', 'regex', 'contains')),
  oem_family            TEXT,  -- null = global
  priority              INT NOT NULL DEFAULT 100,
  source                TEXT NOT NULL CHECK (source IN ('creator', 'dogfood', 'owner_confirmed'))
);
```

**Migrations:** seed script reads `packages/knowledge/**/*.json` → upsert tables. Creator workflow stays file-based; deploy promotes to DB.

### pgvector?

Not for baseline matching. Optional later for **creator-side** “find similar manual sections” during offline extract — not owner runtime. ADR-001 pgvector remains unrelated to schedule truth unless we explicitly add a creator tool.

---

## Part 5 — Owner experience

### Supported vehicle (happy path)

```text
Onboarding: Year / Make / Model (dropdown — supported only at launch)
  → System attaches Schedule Pack
  → knowledge.schedule.recorded events emitted
  → Import history / receipts match via alias ontology
  → Reminders: explainable, deterministic
```

Owner never thinks about OEM manual PDFs for Tier 1 cars.

### Unsupported vehicle (honest path)

```text
"We don't have a verified schedule for this YMM yet."
  → Option A: Upload manual (ADR-007 flow) → extract → owner confirms rows
  → Option B: Generic reminders (oil every 5k) with clear "not OEM-verified" badge
  → Option C: Join waitlist / notify when pack ships
```

Do **not** silently use a neighboring YMM’s pack (2019 Camry pack on 2024 Camry) unless explicitly marked **beta** with disclaimer.

### When matching is ambiguous

```text
Low confidence (no alias hit, multiple candidates)
  → Verification task: "Which service was this?"
  → Owner confirms → optional owner_confirmed alias
  → Never auto-guess schedule baseline
```

This is how the product gets smarter **without** nondeterministic schedule math.

---

## Part 6 — Micro-request decision framework

Use this for every new function (matching, extract, reminders, copy):

| Question | If yes → |
|----------|----------|
| Changes **when** something is due or writes **domain events**? | Deterministic + tests + human gate on ambiguity |
| Input is **messy/unstructured** (PDF, OCR, voice)? | LLM **propose** → schema validate → owner confirm |
| **Copy only** (why / how tone)? | LLM ok; must not alter due date |
| **High frequency** on read path? | Precomputed / cached / rule lookup |
| **Creator-only** offline batch? | LLM ok with QA gate before publish |

---

## Consequences

### Build now (Phase 1)

- Keep deterministic `findLastMatchingService`; grow toward alias-backed `resolveServiceBaseline`.
- Add fixture for TLX CARFAX oil line (`57160` → `code-b`).
- Define JSON Schema for Schedule Pack v1 in `packages/knowledge/`.
- Ship **Tier 1** list (start with TLX + 5–10 high-volume sedans you can QA).
- Onboarding dropdown: **supported YMM only** at public launch.

### Build next (Phase 1.5)

- Postgres seed tables + pack hydration on vehicle create.
- Verification UI for ambiguous line items.
- Creator batch extract pipeline (parallel agents → QA → JSON commit).
- Bake off 2–3 manual-source providers, then add the winning provider behind a
  replaceable discovery interface and the shared validator.

### Explicitly defer

- Runtime LLM/embedding baseline matching.
- “1000 cars” marketing before QA tier exists.
- Cross-user alias learning without anonymization policy.

### Interview line

> “Schedule truth is curated OEM packs and deterministic alias matching — tested and versioned. LLM runs offline when we ingest manuals to *propose* pack rows; owners never depend on probabilistic matching for due dates.”

---

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Runtime LLM for every line-item match | Non-reproducible schedule truth; trust failure |
| Embedding similarity on hot path | Same + no explainability |
| Owner uploads manual for every car | High friction; wrong wedge for mass onboarding |
| 1000 YMMs via unchecked parallel extract | Fragile intervals; liability on wrong oil change timing |
| Single global regex file forever | Does not scale; no canonical IDs or OEM-specific codes |
| OEM-hosted PDFs only | Needlessly fragile when OEM links expire or require sessions; a byte-identical, fully verified mirror can preserve valid evidence |
| Accept aggregator results as truth | Host reputation alone does not prove YMM, market, completeness, or maintenance applicability |

---

## References

- Implementation: `packages/domain/src/knowledge/match-service-name.ts`
- Vehicle schedule projection: `packages/domain/src/schedule/project-maintenance-schedule.ts`
- Knowledge record path: `packages/domain/src/knowledge/record-knowledge-schedule.ts`
- CARFAX fixture: `connectors/carfax-connect/examples/tlx-carfax-history.v1.json`
