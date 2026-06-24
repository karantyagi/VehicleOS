# ADR-001: Use Postgres + pgvector as the core data platform

- Status: Accepted
- Date: 2026-06-23

## Context

VehicleOS needs durable transactional storage for users, vehicles, domain events, tasks, and projections. It also needs semantic retrieval over extracted evidence and memory summaries.

## Decision

Use Postgres as the system of record and enable pgvector for embedding-based retrieval.

## Consequences

### Positive

- Single operational data platform for transactional and semantic workloads
- Strong consistency for event writes, projection updates, and approval workflows
- Mature ecosystem, hosting options, tooling, and observability
- Straightforward local development and interview demonstration setup

### Negative

- High-volume vector workloads may require tuning or external specialization later
- Schema and query discipline is required to avoid overloading one datastore

## Alternatives considered

- Graph database first: rejected due to higher operational and modeling complexity at MVP stage
- Separate vector database from day one: rejected to reduce cognitive and operational overhead early

## Follow-up

- Partition event and projection tables as volume grows
- Add retention and archival policies for raw artifacts
- Re-evaluate dedicated vector infrastructure when retrieval latency or scale justifies it
