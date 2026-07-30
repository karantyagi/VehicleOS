# ADR-015 — Separate owner attention from notification delivery

**Status:** Accepted; current web/capture slice implemented (2026-07-30)
**Deciders:** Product / architecture
**Related:** [ADR-008](./ADR-008-owner-nav-information-architecture.md) · [Owner product implementation queue](../../docs/03-mvp-spec/product-implementation-queue.md)

## Context

VehicleOS is intended to work quietly in the background and involve the owner only when a decision or action is genuinely needed. The current web slice uses **Reminders** as both:

1. an in-app list of unresolved maintenance actions; and
2. an early browser-notification delivery mechanism.

It also models `snoozed` as a task status. That conflates maintenance truth, whether the owner still owes an action, and whether the assistant may interrupt the owner.

A complete notification product has not been designed. It requires channel and permission handling, quiet hours, time zones, frequency policy, deduplication, delivery records, retries, escalation, critical-deadline behavior, accessibility, and user research. Adding more snooze behavior before those decisions would harden the wrong abstraction.

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

### 3. Remove snooze from the current owner workflow

Do not offer **Snooze** or **Remind me later** in the owner UI until notification delivery is designed.

The current owner actions should converge on:

- **Scheduled** — the owner has arranged the work.
- **Done** — the work was completed and can be backed by a record or receipt.
- **Fix this** — the recommendation or source data is wrong.
- **Not needed** — the owner deliberately rejects the recommendation.

Scheduled and completed are distinct persisted task outcomes. **Done** completes the
originating Home item only after a maintenance record is saved successfully. **Fix
this** leaves the item unresolved while corrected history is reprojected.

Existing snooze events remain readable for event-history compatibility. The web cleanup must stop creating new owner snooze decisions and resurface unresolved historical snoozes as attention items.

### 4. Defer notification control as its own product subsystem

Push, email, browser delivery, mute/snooze controls, reminder cadence, and escalation are explicitly deferred. They must be designed together behind a notification-control boundary before implementation.

At minimum, the later design must cover:

- channel preferences and device/browser permissions;
- time zones, quiet hours, and frequency limits;
- idempotent delivery, deduplication, retry, and a delivery ledger;
- the distinction between actual due time, attention time, and next allowed nudge;
- scheduled appointments, completed work, and stale reminders;
- overdue, safety, and legal-deadline behavior;
- accessible controls, understandable copy, and user testing.

The existing browser notification hook is a prototype, not the notification-system contract.

### 5. Keep mobile capture-first

The current mobile scope is intentionally narrow:

- choose or confirm the vehicle;
- capture a receipt or maintenance image;
- record a voice note;
- show upload, retry, and success state.

The mobile phase does not duplicate the web review desk, full history, schedule, owner-attention workflow, or notification center. A capture may link the owner back to the web app when review is required.

## Consequences

### Positive

- Preserves the quiet-assistant promise without hiding unresolved work.
- Removes an ambiguous lifecycle state from the immediate owner experience.
- Keeps the current web and mobile scope small and testable.
- Leaves room for notification specialists and user research to shape delivery behavior later.
- Prevents browser, push, and email implementation details from leaking into maintenance truth.

### Negative

- Owners cannot temporarily mute an individual in-app attention item in this phase.
- Existing snooze contracts remain as compatibility debt for previously recorded events.
- The web app remains the place an owner must open to review unresolved attention.

## Alternatives considered

### Keep the current snooze button

Rejected for the current phase. Without a delivery policy, snooze mainly hides unresolved work and has unclear behavior for overdue items.

### Delete all snooze events and contracts immediately

Rejected. Event history is append-only, and existing dogfood data must remain readable. Compatibility can remain while the owner-facing action is removed.

### Build push notifications now

Deferred. Delivery infrastructure alone would not answer the user-centered questions about cadence, interruption, criticality, and control.
