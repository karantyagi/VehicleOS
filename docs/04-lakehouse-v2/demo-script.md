# VehicleOS v2 — Demo Script (template)

Fill in timestamps and screenshots after completing the one-week checklist.

## 45-second version

> VehicleOS helps owners manage maintenance over years, not single transactions.  
> v1 uses event sourcing in Postgres — every oil change, receipt, and recommendation is an auditable event.  
> v2 shows how I'd scale that same event stream onto a governed lakehouse: bronze for raw events, silver for vehicle timelines, gold for recommendation features — with MLflow tracking extraction quality.  
> The app tier still owns approvals; the lakehouse owns history, analytics, and ML experiments.

## 3-minute version

### 1. Problem (30s)

- Car ownership data is fragmented: receipts, reminders, manuals, shop visits.
- Users need trustworthy recommendations with evidence, not chat guesses.

### 2. v1 architecture (45s)

- Event-sourced domain model (`service.recorded`, etc.)
- Postgres + pgvector for MVP
- AI extracts; rules engine recommends; human approves tasks
- Show: vertical slice flow from `docs/03-mvp-spec/mvp-technical-spec.md`

### 3. v2 lakehouse path (90s)

- Same events land in Delta bronze
- Silver: vehicle timeline and service records (idempotent projections)
- Gold: `miles_since_last_oil_change`, adherence features
- MLflow: compare rules-only vs feature-enriched recommendations
- Embeddings: retrieve manual evidence for explanations

### 4. Tradeoffs (30s)

- Why not lakehouse on day one? OLTP simplicity and faster MVP.
- Why not Kafka yet? Volume doesn't justify ops cost; events replicate batch-first.
- When migrate? Analytics load, multi-year retention, ML experiment volume.

## 10-minute version (system design)

Add whiteboard sections:

1. **Ingestion** — receipt upload → object storage → `document.ingested` event
2. **Medallion** — bronze/silver/gold table responsibilities
3. **Serving** — hot reads from Postgres; batch features from gold; cache strategy
4. **Governance** — Unity Catalog, data contracts, quarantine on low-confidence extraction
5. **Metrics** — pipeline SLA, MLflow experiment lift, cost per active user

## Demo recording checklist

- [ ] MLflow experiment UI showing 2+ runs
- [ ] Notebook cell: bronze event count
- [ ] Notebook cell: silver timeline query
- [ ] Notebook cell: gold recommendation output
- [ ] Notebook cell: top-k embedding retrieval

## Q&A prep

| Question | Answer |
|----------|--------|
| Why Delta Lake? | ACID on object storage, time travel, schema evolution for event payloads |
| How idempotent? | Merge on event `id`; replays rebuild silver from bronze |
| Online/offline consistency? | Gold feature SQL is source of truth; API reads materialized snapshot |
| Failure modes? | Low-confidence extraction → quarantine; DLQ for poison events (verbal) |
