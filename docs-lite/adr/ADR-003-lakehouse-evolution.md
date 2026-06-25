# ADR-003: Evolve the data plane to a governed lakehouse (v2)

- Status: Proposed
- Date: 2026-06-25
- Supersedes: none (extends ADR-001, ADR-002)
- Related: `docs/04-lakehouse-v2/databricks-notebook-checklist.md`, `playbook/06-v2-databricks-style.md`

## Context

VehicleOS v1 (ADR-001, ADR-002) uses Postgres + pgvector as a single operational platform and event-sourced domain events as the write model. That is the right choice for MVP credibility, local development, and interview demos.

As ownership data volume grows — receipts, OCR artifacts, extracted fields, embeddings, recommendation features — three pressures emerge:

1. **Analytics and ML workloads** compete with transactional approval workflows on one database.
2. **Audit and replay** need cheap, durable storage for years of append-only events.
3. **Experiment tracking** for extraction prompts and recommendation quality needs versioning separate from OLTP.

ADR-001 follow-up already anticipated re-evaluating vector infrastructure and archival. This ADR defines that evolution without replacing the v1 application architecture.

## Decision

Introduce a **v2 data plane** on a governed lakehouse (Databricks Community Edition for demos; Delta Lake + Unity Catalog in production framing):

| v1 component | v2 lakehouse role |
|--------------|-------------------|
| `domain_events` (append-only) | **Bronze** — immutable domain event stream on Delta |
| Projections (vehicle timeline, service state) | **Silver** — curated, deduplicated entity tables |
| Recommendation inputs (mileage deltas, adherence) | **Gold** — feature tables for rules + ML |
| Receipt / manual blobs in object storage | **Raw ingestion zone** — unchanged; referenced by bronze |
| pgvector evidence retrieval | **Embeddings index** on Delta or Vector Search; OLTP cache optional |
| Worker jobs (`ocr`, `extract`, `project`) | **Databricks Jobs / notebooks** for batch path |
| Extraction and recommendation experiments | **MLflow** — runs, metrics, prompt/model versions |

**v1 app tier stays:** Next.js, API, human approval gates, and transactional task state remain in the application layer. The lakehouse owns historical data, batch projections, feature generation, and ML experiment lineage — not user-facing workflow authority.

## Architectural principles (unchanged)

1. AI interprets and explains; deterministic systems own state, policy, and execution.
2. Domain events remain the source of truth for *what happened*; projections are derived.
3. Human approval for irreversible or high-risk actions stays in the app tier.
4. Online/offline consistency: gold feature definitions used for both batch analytics and serving.

## v1 vs v2 boundary

```text
┌─────────────────────────────────────────────────────────────┐
│  App tier (v1 — keep)                                       │
│  Next.js → API → approvals, tasks, low-latency reads        │
│  Postgres OLTP for workflow state + hot projections         │
└──────────────────────────┬──────────────────────────────────┘
                           │ emit / replicate domain events
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Data plane (v2 — additive)                                 │
│  Bronze (events) → Silver (entities) → Gold (features)    │
│  MLflow (experiments) + embeddings (RAG evidence)           │
└─────────────────────────────────────────────────────────────┘
```

At MVP scale, events may be written only to Postgres. The v2 path **replays or syncs** the same event shapes into bronze — no second domain model.

## Event-to-medallion mapping

| Domain event | Bronze payload | Silver output | Gold output |
|--------------|----------------|---------------|-------------|
| `document.ingested` | raw metadata + S3 path | `documents` row | — |
| `document.extraction.completed` | OCR + structured fields + confidence | `extractions` row | extraction quality features |
| `service.recorded` | normalized service fields | `service_records` → vehicle timeline | miles_since_service, interval adherence |
| `maintenance.recommendation.created` | rule inputs + explanation | `recommendations` row | recommendation lift labels |
| `task.created` / `task.approved` | task state transition | `tasks` projection | user response features |

## When to stay on v1 only

- Single-user or demo scale; &lt; 10k events.
- No ML experiment comparison needed beyond rules baseline.
- Interview story is applied AI / RAG / agents — not data platform.

## When to activate v2

- Databricks or Snowflake **applied AI / data platform** role in weekly digest.
- Need to demonstrate medallion architecture, MLflow, or feature-store thinking.
- v1 vertical slice is working end-to-end in Postgres (prerequisite).

## Streaming and messaging (architecture only)

At scale, receipt ingestion would publish to an event bus before bronze landing. Databricks Structured Streaming would incrementally update silver tables.

**Out of scope for v2 week-one build:** operating Kafka, Flink, or a dedicated streaming cluster. Study-level fluency only unless a platform-role JD explicitly requires hands-on depth.

## Governance (production framing)

- **Unity Catalog** schemas: `vehicleos_bronze`, `vehicleos_silver`, `vehicleos_gold`
- Data contracts per connector (CARFAX, receipt OCR, manual uploads)
- Schema evolution via Delta `mergeSchema` + explicit version bumps on events
- Quality checks: null rate on VIN/mileage, confidence thresholds, quarantine table
- Lineage: bronze event ID → silver row → gold feature → recommendation ID

## Consequences

### Positive

- Natural evolution of ADR-002 event sourcing — not a rewrite
- Strong interview narrative for enterprise AI and Databricks-tier roles
- Separates OLTP latency from batch/ML compute
- MLflow gives credible experiment tracking without custom tooling

### Negative

- Two data paths to maintain during transition (Postgres + lakehouse)
- Community Edition limits; demo ≠ production ops experience
- Risk of over-building v2 before v1 vertical slice ships

## Alternatives considered

| Alternative | Verdict |
|-------------|---------|
| Replace Postgres entirely with Databricks | Rejected — approval workflows and low-latency reads need OLTP |
| Separate Kafka + Flink project | Rejected for now — poor ROI unless platform-role JD appears |
| Snowflake instead of Databricks | Valid for Snowflake targets; same medallion mapping applies |
| Keep pgvector only, skip lakehouse | Default until v1 ships or digest triggers v2 |

## Implementation follow-up

See `docs/04-lakehouse-v2/databricks-notebook-checklist.md` for the one-week execution plan.

Deliverables:

1. Three Delta tables (bronze / silver / gold) with synthetic vertical-slice data
2. One MLflow experiment comparing rules-only vs feature-enriched recommendations
3. Embeddings table + similarity query over manual/receipt chunks
4. `ADR-003` (this document) + demo script for 3-minute walkthrough

## Success criteria

- [ ] Same `service.recorded` event shape in Postgres (v1) and Delta bronze (v2)
- [ ] Silver projection rebuildable from bronze via idempotent notebook job
- [ ] MLflow run logged with prompt version, extraction confidence, and latency
- [ ] Verbal answer ready: "Why not Kafka yet?" and "When would you migrate fully?"
