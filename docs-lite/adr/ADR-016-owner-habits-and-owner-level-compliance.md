# ADR-016 — Owner habits and owner-level compliance

**Status:** Accepted; first vertical slice implemented (2026-07-31)

**Deciders:** Product / architecture

**Related:** [ADR-002](./ADR-002-event-sourced-domain-model.md) · [ADR-009](./ADR-009-pdf-record-import.md) · [ADR-014](./ADR-014-owner-centered-maintenance-item-intelligence.md) · [ADR-015](./ADR-015-owner-attention-and-deferred-notification-control.md)

## Context

VehicleOS receives facts with different ownership boundaries:

- “I add Chevron Techron every 3,000 miles” is an **owner habit** that affects one vehicle's maintenance schedule.
- A driver's-license expiration is an **owner-level compliance deadline**. It follows the person across the garage and must not be duplicated onto a vehicle.
- RMV imports can contain both vehicle records and owner-level facts.
- Voice and future LLM extraction are uncertain input paths; neither should silently change durable schedule truth.

Using one vehicle event stream for all of these facts would make personal deadlines disappear when a vehicle is removed, duplicate them for multi-car owners, and weaken the existing approval boundary for maintenance intervals.

## Decision

### 1. Owner habits are vehicle-scoped proposals

Voice and text capture produce the public `OwnerHabitProposalV1` contract:

- canonical service name;
- mileage and/or time interval;
- interval basis;
- capture channel (`voice` or `text`);
- extraction method (`rules` or `llm`);
- source text and confidence.

The current implementation uses a small deterministic extractor for representative Techron/fuel-system-cleaner phrasing. A later intelligence call must emit the same schema. Tuned prompts, scoring thresholds, and broad extraction heuristics remain in the private engine.

Every proposal enters `VERIFY_OWNER_INTERVAL`. It becomes an owner interval overlay only after explicit approval. Raw text, provenance, and the proposed structure remain auditable; uncertain extraction never mutates the schedule directly.

### 2. Personal legal deadlines use an owner aggregate

Driver's-license renewal is stored as `owner.driver_license.recorded` on aggregate type `owner`, keyed by the authenticated owner ID. The record supports:

- issuing agency and optional license class;
- record date, expiration date, description, and safe display details;
- source (`rmv_import` or `owner_note`);

The contract intentionally excludes license number, date of birth, and document images. Renewal events retain an audit trail while owner-facing projections show the current credential.

Owner deadlines project into the same due-item and attention model as maintenance, registration, and inspection. The UI labels them **Owner** and explains that they do not belong to a car. The initial attention window is 60 days; notification delivery remains deferred under ADR-015.

### 3. RMV import separates vehicle and owner writes

An RMV draft can contain records with different ownership boundaries:

- registration, inspection, title, and similar records, written to the selected vehicle; and
- a safe `license` record, routed once to the authenticated owner aggregate.

The mapper may use license class only in a human-readable renewal description. It does not persist the extracted license number or birth date.

### 4. Dogfood fixtures are explicit and vehicle-aware

Record import exposes both supported dogfood profiles. A fixture can load only when its VIN, or its year/make/model fallback, matches the active vehicle. A separate, clearly synthetic RMV deadline fixture demonstrates upcoming registration, inspection, and driver's-license items without rewriting the owner's historical dogfood.

## Consequences

### Positive

- One capture contract works for rules today and an LLM later.
- Owner approval remains the authority for personal maintenance intervals.
- A driver's-license deadline appears across the garage without becoming vehicle data.
- RMV imports preserve their mixed source while writing each fact to the correct aggregate.
- Dogfood testing cannot accidentally import one car's records into another.

### Negative

- The initial deterministic habit vocabulary is intentionally narrow.
- Owner-level compliance currently supports driver's-license renewal only.
- Owner-level deadlines are visible through the active vehicle dashboard until a garage-wide Home projection is introduced.

## Alternatives considered

### Store habits as free-form owner notes

Rejected. Notes alone cannot drive deterministic schedule projections and do not provide an approval-ready LLM handoff.

### Store a driver's license on every vehicle

Rejected. It duplicates one personal fact, creates inconsistent renewals, and gives vehicle deletion the wrong data-lifecycle semantics.

### Let extraction write intervals immediately

Rejected. Voice transcripts and LLM output can be wrong; durable maintenance truth requires owner confirmation.
