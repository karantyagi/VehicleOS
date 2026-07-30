# Maintenance item intelligence delivery queue

**Scope:** Owner-facing maintenance items and reminder rationale  
**Decision:** [ADR-014](../../docs-lite/adr/ADR-014-owner-centered-maintenance-item-intelligence.md)  
**Pilot:** Rotate Tires  
**Last updated:** 2026-07-30

This queue records the adopted direction. It does not mark documentation as
shipped product behavior.

---

## Status key

- **Done** - present on `master`
- **Next** - Rotate Tires pilot implementation
- **Phase 2** - shared rollout after the pilot
- **Later** - intentionally deferred

---

## Current foundation

| ID | Work | Status | Evidence |
|---|---|---|---|
| MI-00 | Deterministic OEM schedule projection and reminders | Done | `project-maintenance-schedule.ts`, `build-owner-reminders.ts` |
| MI-01 | Owner interval overlay persistence | Done | `OwnerContextMemory.intervalOverlays` |
| MI-02 | Editable interval form for generated verification tasks | Done | `interval-confirm-form.tsx` |
| MI-03 | Tire inspect-sooner context inputs | Done | tread, TPMS, vibration/cupping, special setup checkboxes |
| MI-04 | Per-item recommendation and four-axis rationale component | Not built | Current UI has a reason string and task-scoped form only |

---

## Rotate Tires pilot - Next

| ID | Deliverable | Acceptance signal |
|---|---|---|
| MI-10 | Split service facts, descriptive insight, recommendation, and owner decision | Each layer can render independently |
| MI-11 | Remove the three-record gate from Rotate Tires insights | 0/1/2/3+ record tests all produce honest states |
| MI-12 | Convert the 15% stability check from suppression to confidence evidence | Variable gaps render as `Recent gaps vary` |
| MI-13 | Add shared public `MaintenanceItemInsight` contract | Includes four axes, source, status, confidence, provenance |
| MI-14 | Add representative `RotateTiresPolicy` | Mileage-first; time does not silently control |
| MI-15 | Add collapsed/expanded Rotate Tires item | Collapsed by default; concise status; chevron |
| MI-16 | Add assistant recommendation block | Miles, rationale, qualitative confidence, evidence note |
| MI-17 | Make owner mileage entry always available | Any valid mileage can be saved without a generated task |
| MI-18 | Show OEM / Assistant / Owner interval source and restore OEM | Active source is visible and auditable |
| MI-19 | Add correction actions | Record rotation, correct last service, update mileage |
| MI-20 | Add four-axis `Why this reminder` view | Actual operands, evidence state, and provenance |
| MI-21 | Add TLX dogfood/eval cases | Last gaps 7,360 / 7,982 / 5,594; average 6,979; variable confidence |
| MI-22 | Add copy/trust regression tests | No one-gap `average`; no unsupported `habit`; no silent source switch |
| MI-23 | Add structured action-recommendation contract | What/when/how/where/time/cost/why/owner fit |
| MI-24 | Add TLX Costco action plan | Derive current tire set, provider history, and observed `$0` cost |
| MI-25 | Add benefit confirmation memory | Observed `$0` never becomes a guaranteed entitlement silently |
| MI-26 | Add provider/action confidence | Timing, provider, cost, and booking confidence stay separate |

---

## All maintenance items - Phase 2

| ID | Deliverable | Interim UI |
|---|---|---|
| MI-30 | Render every maintenance item as a collapsed row | Existing deterministic due state remains |
| MI-31 | Add four rationale axes for every item | Missing axis shows `Missing`; unfinished evaluator shows `Upcoming` |
| MI-32 | Add per-item recommendation status | `Assistant recommendation · Phase 2 · upcoming · in development` |
| MI-33 | Replace generic reminder reasons with structured `Why now` operands | Active interval + baseline + current position + remaining/overdue |
| MI-34 | Implement oil-change evaluator | Phase 2 |
| MI-35 | Implement brake evaluator | Phase 2 |
| MI-36 | Implement fluids evaluators, beginning with rear differential | Phase 2 |
| MI-37 | Implement filter and inspection evaluators | Phase 2 |
| MI-38 | Calibrate qualitative confidence across item policies | Private tuned logic + public methodology/evals |
| MI-39 | Notification deep links open the relevant expanded item | Phase 2 |
| MI-40 | Add provider catalog and verified action links | No inferred URLs |
| MI-41 | Add time-versus-money option ranking | Owner preferences and current provider evidence |
| MI-42 | Add offer/discount ingestion | Expiry, eligibility, source, and freshness required |

---

## Later

| ID | Deliverable | Reason deferred |
|---|---|---|
| MI-50 | Tire sensor / tread-depth integrations | Requires reliable external evidence |
| MI-51 | Cross-owner learned intervals | Privacy, tenancy, and consent policy not defined |
| MI-52 | Automatic interval changes from conditions | Owner trust requires an explicit decision |
| MI-53 | Full conversational maintenance planning | Quiet notification-first flow remains primary |

---

## Required implementation sequence

1. MI-10 through MI-14: contract and deterministic policy boundary.
2. MI-15 through MI-20: one complete reminder interaction.
3. MI-21 through MI-26: TLX interval and Costco action recommendation.
4. Dogfood Rotate Tires.
5. Begin Phase 2 only after the pilot copy and confidence are understandable
   without explanation from the builder.
