# VehicleOS v2 — Databricks Lakehouse One-Week Checklist

**Branch:** `feature/v2-lakehouse-databricks`  
**Prerequisite:** v1 vertical slice logic defined (`docs/03-mvp-spec/mvp-technical-spec.md`)  
**ADR:** `docs-lite/adr/ADR-003-lakehouse-evolution.md`  
**Interview variant:** `playbook/06-v2-databricks-style.md` (workspace parent folder)

## Goal

Add a **parallel lakehouse data path** for one vertical slice — not a full app rewrite.

**In scope:** Delta medallion tables, one pipeline notebook, MLflow runs, embeddings query, demo script.  
**Out of scope:** Kafka/Flink clusters, CARFAX integration, production Unity Catalog setup.

---

## Before you start (Day 0 — ~2 hours)

- [ ] Finish or stub v1 event payloads in `packages/domain` and `db/migrations/0001_init.sql`
- [ ] Create [Databricks Community Edition](https://community.cloud.databricks.com/) account
- [ ] Create catalog/schema: `vehicleos` → `bronze`, `silver`, `gold` (or hive_metastore equivalents on CE)
- [ ] Prepare 5–10 synthetic assets:
  - [ ] 3 fake receipt JSON payloads (shop name, date, mileage, line items)
  - [ ] 1 vehicle profile (VIN, year, make, model, current mileage)
  - [ ] 2 manual text chunks (oil change interval, tire rotation interval)
- [ ] Create repo folder: `platform/databricks/notebooks/` (notebooks live here)

---

## Day 1 — Foundation and bronze layer

**Time:** ~4 hours

### Setup

- [ ] Create notebook `01_setup_and_bronze.py` (Databricks source format)
- [ ] Configure cluster: single-node, DBR 14.x+, Python 3.10+
- [ ] Install if needed: `mlflow`, `openai` (or use Databricks model serving stub)

### Bronze tables

- [ ] Create `vehicleos.bronze.domain_events` Delta table:

```sql
-- Shape mirrors db/migrations/0001_init.sql domain_events
CREATE TABLE IF NOT EXISTS vehicleos.bronze.domain_events (
  id STRING,
  aggregate_type STRING,
  aggregate_id STRING,
  event_type STRING,
  event_version INT,
  payload_json STRING,
  causation_id STRING,
  correlation_id STRING,
  ingested_at TIMESTAMP
) USING DELTA;
```

- [ ] Seed bronze with synthetic events for one vehicle:

| Order | event_type | Notes |
|-------|------------|-------|
| 1 | `document.ingested` | Receipt upload metadata |
| 2 | `document.extraction.completed` | OCR + structured fields |
| 3 | `service.recorded` | Normalized oil change |
| 4 | `maintenance.recommendation.created` | Next oil change proposal |
| 5 | `task.created` | Awaiting user approval |

- [ ] Verify: `SELECT event_type, payload_json FROM vehicleos.bronze.domain_events ORDER BY ingested_at`

### Exit criteria

- [ ] Bronze contains full vertical-slice event chain for one vehicle
- [ ] Event JSON matches v1 domain event shapes

---

## Day 2 — Silver projections

**Time:** ~4 hours

### Notebook: `02_silver_projections.py`

- [ ] Create `vehicleos.silver.vehicles` — one row per aggregate_id
- [ ] Create `vehicleos.silver.service_records` — parsed from `service.recorded` events
- [ ] Create `vehicleos.silver.recommendations` — parsed from `maintenance.recommendation.created`

### Transformation rules

- [ ] Parse `payload_json` with schema per `event_type` (use `from_json` + explicit schema)
- [ ] Idempotent merge on `event_id` or `id` — re-running notebook must not duplicate rows
- [ ] Build `vehicleos.silver.vehicle_timeline` view: chronological service history per vehicle

### Exit criteria

- [ ] Silver `service_records` shows oil change with date, mileage, shop
- [ ] Re-run notebook produces identical row counts (idempotency)

---

## Day 3 — Gold features and rules baseline

**Time:** ~4 hours

### Notebook: `03_gold_features.py`

- [ ] Create `vehicleos.gold.maintenance_features`:

| Column | Source |
|--------|--------|
| `vehicle_id` | silver.vehicles |
| `current_mileage` | latest service or vehicle profile |
| `miles_since_last_oil_change` | derived |
| `days_since_last_oil_change` | derived |
| `manufacturer_oil_interval_miles` | static rule table (e.g. 5000) |
| `miles_until_oil_change` | interval − miles_since |
| `adherence_score` | on-time vs late history (0–1) |

- [ ] Implement **rules-only baseline** recommendation in notebook:
  - If `miles_until_oil_change < 500` → recommend oil change
  - Output: `recommendation_type`, `explanation`, `confidence = 1.0`

- [ ] Compare rules output to bronze `maintenance.recommendation.created` event — document match/mismatch

### Exit criteria

- [ ] Gold table has one feature row per vehicle
- [ ] Rules baseline produces explainable recommendation without LLM

---

## Day 4 — MLflow experiments

**Time:** ~4 hours

### Notebook: `04_mlflow_extraction_and_recommendations.py`

- [ ] Start MLflow experiment: `vehicleos-extraction-v1`

### Log extraction run (simulated or real LLM)

- [ ] Parameters: `prompt_version`, `model`, `temperature`
- [ ] Metrics: `extraction_confidence`, `field_count_matched`, `latency_ms`
- [ ] Artifacts: prompt text, sample receipt, parsed JSON output

- [ ] Start MLflow experiment: `vehicleos-recommendation-v1`

### Log recommendation comparison

- [ ] Run A: rules-only (Day 3 baseline)
- [ ] Run B: rules + `adherence_score` weighting (simple feature enrichment)
- [ ] Metrics: `recommendation_match_to_human`, `explanation_length`, `compute_ms`
- [ ] Tag runs: `baseline=rules`, `variant=feature_enriched`

### Exit criteria

- [ ] At least 2 runs visible in MLflow UI with comparable metrics
- [ ] Can answer: "How do you track prompt changes over time?"

---

## Day 5 — Embeddings and RAG evidence

**Time:** ~4 hours

### Notebook: `05_embeddings_rag.py`

- [ ] Create `vehicleos.silver.document_chunks` (chunk_id, source, text, vehicle_id)
- [ ] Create `vehicleos.silver.document_embeddings` (chunk_id, embedding ARRAY&lt;FLOAT&gt;)

- [ ] Chunk synthetic manual text (500-token windows or paragraph splits)
- [ ] Generate embeddings via:
  - [ ] Databricks Foundation Model API, **or**
  - [ ] `sentence-transformers` on CE cluster, **or**
  - [ ] OpenAI `text-embedding-3-small` with API key in secrets

- [ ] Implement similarity query:

```python
# Pseudocode — adapt to your embedding stack
query = "When should I change my oil?"
# Return top-3 chunks with scores
```

- [ ] Tie retrieval to recommendation explanation: "Evidence: manual section X + last service at Y miles"

### Exit criteria

- [ ] Top-k retrieval returns relevant manual chunk for oil change question
- [ ] Embeddings stored on Delta (not ephemeral notebook state)

---

## Day 6 — Documentation and diagram

**Time:** ~3 hours

- [ ] Confirm `docs-lite/adr/ADR-003-lakehouse-evolution.md` reflects what you built
- [ ] Add `platform/databricks/README.md` with:
  - [ ] Notebook run order (01 → 05)
  - [ ] Cluster requirements
  - [ ] Link to ADR-003
- [ ] Add or update mermaid diagram in `docs-lite/diagrams/` (optional): `lakehouse-v2-context.mmd`
- [ ] Write 3-minute demo script (`docs/04-lakehouse-v2/demo-script.md`):
  1. Problem: fragmented ownership data
  2. v1: event-sourced Postgres MVP
  3. v2: same events → medallion → MLflow → RAG evidence
  4. Tradeoff: when to stay on v1 vs scale to v2

### Exit criteria

- [ ] Another engineer (or interviewer) could run notebooks 01–05 from README alone

---

## Day 7 — Interview polish and integration story

**Time:** ~3 hours

- [ ] Practice 45-second, 3-minute, and 10-minute versions of the v2 story
- [ ] Prepare answers:

| Question | Your answer (fill after build) |
|----------|-------------------------------|
| Why lakehouse instead of warehouse? | |
| Why keep Postgres in v1? | |
| How do you ensure online/offline consistency? | |
| When would you add Kafka? | At ingestion &gt; X events/day; need decoupled producers |
| What would you do differently in production? | Unity Catalog, job scheduling, monitoring, cost caps |

- [ ] Record a 3-min screen capture of MLflow + one notebook run (optional but high ROI)
- [ ] Merge checklist items into README "What this project demonstrates" when ready for main

### Exit criteria

- [ ] Can whiteboard v1 + v2 architecture without notes in &lt; 5 minutes
- [ ] Demo script rehearsed once out loud

---

## Notebook file plan

```text
platform/databricks/
├── README.md
└── notebooks/
    ├── 01_setup_and_bronze.py
    ├── 02_silver_projections.py
    ├── 03_gold_features.py
    ├── 04_mlflow_extraction_and_recommendations.py
    └── 05_embeddings_rag.py
```

---

## Weekly time budget (fits ~25–30 hrs prep plan)

| Day | Focus | Hours |
|-----|-------|-------|
| 0 | Prerequisites | 2 |
| 1 | Bronze | 4 |
| 2 | Silver | 4 |
| 3 | Gold + rules | 4 |
| 4 | MLflow | 4 |
| 5 | Embeddings | 4 |
| 6 | Docs + diagram | 3 |
| 7 | Demo polish | 3 |
| **Total** | | **~28** |

Run this week **after** v1 vertical slice ships, or overlap only Days 0–1 if v1 events are stubbed.

---

## Do not do (time sinks)

- ❌ Separate Kafka or Flink repository
- ❌ Rewrite Next.js app to call Databricks SQL directly
- ❌ Full CARFAX connector on lakehouse path
- ❌ Production-grade Unity Catalog + IAM setup on CE
- ❌ Fine-tune a custom model (MLflow on rules + extraction is enough)

---

## Success checklist (end of week)

- [ ] Bronze → silver → gold pipeline runs end-to-end on synthetic data
- [ ] MLflow shows extraction + recommendation experiment runs
- [ ] Embeddings similarity query returns relevant manual evidence
- [ ] ADR-003 and demo script complete
- [ ] v1 Postgres path still works independently
