# VehicleOS — Databricks Lakehouse (v2)

Parallel data-plane implementation for the v1 event-sourced domain model. See ADR-003 for the architectural decision.

## Documents

| File | Purpose |
|------|---------|
| `docs-lite/adr/ADR-003-lakehouse-evolution.md` | Why v2 exists and how it maps to v1 |
| `docs/04-lakehouse-v2/databricks-notebook-checklist.md` | One-week execution plan (day by day) |
| `docs/04-lakehouse-v2/demo-script.md` | Interview walkthrough (fill in after build) |

## Notebooks (to be added)

Run in order on Databricks Community Edition:

1. `notebooks/01_setup_and_bronze.py` — Delta bronze `domain_events`
2. `notebooks/02_silver_projections.py` — vehicle timeline, service records
3. `notebooks/03_gold_features.py` — maintenance features + rules baseline
4. `notebooks/04_mlflow_extraction_and_recommendations.py` — experiment tracking
5. `notebooks/05_embeddings_rag.py` — document chunks + similarity retrieval

## Cluster

- DBR 14.x+, single-node
- Python 3.10+
- Libraries: `mlflow` (preinstalled on most runtimes)

## v1 vs v2

**v1** (`apps/`, `db/`) — OLTP, approvals, MVP demo.  
**v2** (this folder) — batch medallion path, MLflow, embeddings at scale.

Same domain events. Different data plane. App tier unchanged.
