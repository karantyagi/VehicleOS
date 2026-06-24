# ADR-002: Use event sourcing for domain state transitions

- Status: Accepted
- Date: 2026-06-23

## Context

Vehicle ownership data evolves over years and can include conflicting evidence. VehicleOS must explain why recommendations exist and preserve an auditable trail of fact changes.

## Decision

Represent authoritative state transitions as append-only domain events. Materialize query-optimized projections for read paths.

## Consequences

### Positive

- Full auditability and replayability for recommendation explanations
- Better handling of corrections and evidence conflicts
- Clear separation of write-model integrity and read-model performance

### Negative

- Requires projection pipelines and idempotent event processing
- Introduces additional complexity compared to simple mutable CRUD tables

## Alternatives considered

- Mutable CRUD source of truth: rejected due to weak historical explainability
- Full workflow engine first (Temporal/LangGraph): deferred; queue and workers are sufficient for MVP

## Follow-up

- Define event versioning policy before production rollouts
- Implement projection rebuild tooling and backfill scripts
- Add invariant tests for event streams and state transitions
