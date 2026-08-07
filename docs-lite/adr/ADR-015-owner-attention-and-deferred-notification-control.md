# ADR-015 — Separate owner attention from notification delivery

**Status:** Accepted; current web/capture slice implemented (2026-07-30)
**Deciders:** Product / architecture
**Related:** [ADR-008](./ADR-008-owner-nav-information-architecture.md) · [Owner product implementation queue](../../docs/03-mvp-spec/product-implementation-queue.md)

## Context

VehicleOS is intended to work quietly in the background and involve the owner only when a decision or action is genuinely needed. The current web slice uses **Reminders** as both:

1. an in-app list of unresolved maintenance actions; and
2. an early browser-notification delivery mechanism.

An earlier implementation also modeled a per-item delivery delay as a maintenance-task status. That conflated maintenance truth, whether the owner still owed an action, and whether the assistant could interrupt the owner.

A complete notification product has not been designed. It requires channel and permission handling, quiet hours, time zones, frequency policy, deduplication, delivery records, retries, escalation, critical-deadline behavior, accessibility, and user research. Adding delivery-delay behavior before those decisions would harden the wrong abstraction.

## Decision

### 1. Keep three concepts separate

| Concept | Responsibility |
|---------|----------------|
| **Maintenance truth** | Actual history, schedule, due date, and overdue state |
| **Owner attention** | Unresolved actions the owner can review in the web app |
| **Notification delivery** | Whether, when, and through which channel the assistant interrupts the owner |

Notification state must never rewrite a due date or make unresolved maintenance disappear from schedule truth.

### 2. Current product scope is pull-based web attention

For the current phase, the owner web app is the complete review and action surface:

- Use **Attention** as the owner-facing concept rather than promising a complete notification system.
- Lead with what needs action this week; expose next week and this month for planning.
- Keep overdue work visible until it is scheduled, completed, corrected, or explicitly rejected.
- Keep the full maintenance schedule and history available as durable truth.
- Treat rare assistant verification questions separately from maintenance actions.

The exact navigation copy and time-bucket UI are implementation work, not part of this ADR.

### 3. Place owner verification contextually

Owner verification protects maintenance truth when the assistant cannot safely choose a date, mileage, imported row, vehicle fact, or maintenance pattern.

- Do not add a permanent owner navigation destination for rare verification work.
- Show blocking questions above maintenance attention on **Home** and advisory questions below it.
- Add a count to **Home** only while questions are unresolved.
- Mark the affected history record with **Needs confirmation** and deep-link review to the exact record or field.
- Keep resolved decisions as a collapsed audit trail in Maintenance history.
- Keep the dedicated **Owner verification** workspace available in developer mode.

The owner-facing copy is **The assistant needs your confirmation**, not an internal queue or review-system label. Nothing is shown when there is nothing to verify.

### 4. Keep per-item delay controls out of the current owner workflow

Do not offer an owner-facing control that temporarily hides unresolved attention until notification delivery is designed.

The current owner actions should converge on:

- **Scheduled** — the owner has arranged the work.
- **Done** — the work was completed and can be backed by a record or receipt.
- **Fix this** — the recommendation or source data is wrong.
- **Not needed** — the owner deliberately rejects the recommendation.

Scheduled and completed are distinct persisted task outcomes. **Done** completes the
originating Home item only after a maintenance record is saved successfully. **Fix
this** leaves the item unresolved while corrected history is reprojected.

The production event store was audited on 2026-07-30 and contained no historical delay decisions or related metadata. The obsolete task status, decision payload fields, projection behavior, API compatibility, and UI compatibility were therefore removed without a data migration.

### 5. Defer notification control as its own product subsystem

Push, email, browser delivery, mute/defer controls, reminder cadence, and escalation are explicitly deferred. They must be designed together behind a notification-control boundary before implementation.

At minimum, the later design must cover:

- channel preferences and device/browser permissions;
- time zones, quiet hours, and frequency limits;
- idempotent delivery, deduplication, retry, and a delivery ledger;
- the distinction between actual due time, attention time, and next allowed nudge;
- scheduled appointments, completed work, and stale reminders;
- overdue, safety, and legal-deadline behavior;
- accessible controls, understandable copy, and user testing.

The former browser-notification hook was a prototype, not the notification-system contract, and has been removed from the current owner slice.

Stable app navigation targets are permitted in the current scope. A link may
open the exact reminder or maintenance row expanded and focused. That routing
contract is useful for owner handoffs today and may later be consumed by a
notification subsystem; it does not implement notification delivery, cadence,
permissions, deduplication, retries, or channel preferences.

### 6. Keep mobile capture-first

The current mobile scope is intentionally narrow:

- choose or confirm the vehicle;
- capture a receipt or maintenance image;
- type or dictate a service note;
- show upload, retry, and success state.

The mobile phase does not duplicate the web review desk, full history, schedule, owner-attention workflow, or notification center. A capture may link the owner back to the web app when review is required.

Text is the canonical service-note capture record. Browser dictation is an optional convenience that fills the same editable field; it is not a separate voice assistant or notification channel. See ADR-020.

## Consequences

### Positive

- Preserves the quiet-assistant promise without hiding unresolved work.
- Removes an ambiguous lifecycle state from the immediate owner experience.
- Keeps the current web and mobile scope small and testable.
- Leaves room for notification specialists and user research to shape delivery behavior later.
- Prevents browser, push, and email implementation details from leaking into maintenance truth.

### Negative

- Owners cannot temporarily mute an individual in-app attention item in this phase.
- The web app remains the place an owner must open to review unresolved attention.

## Alternatives considered

### Keep the previous per-item delay control

Rejected for the current phase. Without a delivery policy, a delay control mainly hides unresolved work and has unclear behavior for overdue items.

### Retain obsolete compatibility contracts

Rejected after the production audit found no stored events requiring compatibility. Carrying unreachable states would add lifecycle branches and testing cost without protecting any data.

### Build push notifications now

Deferred. Delivery infrastructure alone would not answer the user-centered questions about cadence, interruption, criticality, and control.
