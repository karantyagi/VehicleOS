# Maintenance item intelligence delivery queue

**Scope:** Owner-facing maintenance items and reminder rationale

**Decision:** [ADR-014](../../docs-lite/adr/ADR-014-owner-centered-maintenance-item-intelligence.md)

**Pilot:** Rotate Tires

**Last updated:** 2026-07-30

This queue records the adopted direction and implementation status on
`agent/maintenance-reminder-recommendation-pilot`. `Implemented` becomes
`Done` after merge to `master`.

---

## Status key

- **Done** - present on `master`
- **Implemented** - built and verified on the pilot branch
- **Partial** - useful slice built; listed acceptance work remains
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
| MI-04 | Per-item recommendation and four-axis rationale component | Implemented | `MaintenanceItemIntelligence`, `maintenance-intelligence-summary.tsx` |

---

## Rotate Tires pilot

| ID | Deliverable | Status | Acceptance signal |
|---|---|---|---|
| MI-10 | Split service facts, descriptive insight, recommendation, and owner decision | Implemented | Each layer renders independently |
| MI-11 | Remove the three-record gate from Rotate Tires insights | Implemented | 0/1/2/3+ states; proposal starts with one observed gap |
| MI-12 | Convert the 15% stability check from suppression to confidence evidence | Implemented | Variable gaps remain visible and reduce confidence |
| MI-13 | Add shared public `MaintenanceItemIntelligence` contract | Implemented | Four axes, source, status, confidence, and evidence IDs |
| MI-14 | Add representative Rotate Tires policy | Implemented | Mileage-first; time does not silently control |
| MI-15 | Add collapsed/expanded Rotate Tires item | Implemented | Collapsed by default; concise status; chevron |
| MI-16 | Add assistant recommendation block | Implemented | Miles, rationale, qualitative confidence, evidence note |
| MI-17 | Make owner mileage entry always available | Implemented | Valid mileage can be saved without a generated task |
| MI-18 | Show OEM / Assistant / Owner interval source and restore OEM | Implemented | Active source is visible and auditable |
| MI-19 | Add correction actions | Phase 2 | Add/repair service and update odometer from the item |
| MI-20 | Add four-axis `Why this reminder` view | Implemented | Actual operands and evidence states |
| MI-21 | Add TLX dogfood/eval cases | Implemented | Current tire-set intervals 5,853 / 7,982 / 5,594; median 5,853; average 6,476; 6,000 recommendation |
| MI-22 | Add copy/trust regression tests | Partial | Domain tests cover current-tire reset, one-gap, and variable-gap language; component copy tests remain Phase 2 |
| MI-23 | Add structured action-recommendation contract | Implemented | What/when/how/where/time/cost/why/owner fit |
| MI-24 | Add TLX Costco action plan | Implemented | Current tire set, provider history, and observed `$0` cost |
| MI-25 | Add benefit confirmation memory | Implemented | Observed `$0` requires owner confirmation |
| MI-26 | Add provider/action confidence | Implemented | Timing, provider, cost, and booking confidence stay separate |
| MI-27 | Reset tire evidence at the latest installation | Implemented | Older tire-set rotations remain historical but cannot influence the current-set recommendation |

---

## All maintenance items - Phase 2

| ID | Deliverable | Interim UI |
|---|---|---|
| MI-30 | Render every maintenance item as a collapsed row | Implemented |
| MI-31 | Add four rationale axes for every item | Implemented contract and UI; item-specific evaluators remain Phase 2 |
| MI-32 | Add per-item recommendation status | Implemented placeholder: `Phase 2 · upcoming · in development` |
| MI-33 | Replace generic reminder reasons with structured `Why now` operands | Implemented |
| MI-34 | Implement oil-change evaluator | Phase 2 |
| MI-35 | Implement brake evaluator | Phase 2 |
| MI-36 | Implement fluids evaluators, beginning with rear differential | Phase 2 |
| MI-37 | Implement filter and inspection evaluators | Phase 2 |
| MI-38 | Calibrate qualitative confidence across item policies | Private tuned logic + public methodology/evals |
| MI-39 | Notification deep links open the relevant expanded item | Phase 2 |
| MI-40 | Add provider catalog and verified action links | Partial: official Costco entry point only |
| MI-41 | Add time-versus-money option ranking | Phase 2: pilot emits one evidence-backed plan |
| MI-42 | Add offer/discount ingestion | Expiry, eligibility, source, and freshness required |
| MI-43 | Add evidence-backed appointment duration and owner-time estimate | Phase 2: never infer wait time from provider type |

### Phase 2 acceptance notes

- **MI-19 - corrections:** expanded items can add or repair the relevant service
  baseline and update the odometer without leaving the item; recalculation is
  deterministic and the edit is auditable.
- **MI-22 - trust copy:** component tests cover collapsed defaults, one-interval
  wording, variable evidence, OEM/Assistant/Owner source labels, and all
  `upcoming / in development` states.
- **MI-34 through MI-37 - item policies:** each policy declares its primary
  schedule basis, item-specific evidence, safety/inspect-sooner signals, four
  rationale-axis facts, recommendation state, and eval fixtures. Rotate Tires
  logic is not copied into unrelated items.
- **MI-38 - confidence:** public methodology and representative evals remain in
  `VehicleOS`; tuned weights and production thresholds remain in the private
  engine.
- **MI-39 - notification handoff:** a reminder notification opens the exact
  vehicle and item expanded, then returns focus to the owner’s next action.
- **MI-40 - providers:** every action link has provider identity, location,
  source, verification timestamp, and safe fallback when no direct booking URL
  is verified.
- **MI-41 - alternatives:** rank only evidence-backed options and show the
  owner’s time-versus-money tradeoff without assuming dealer, DIY, or mobile
  service is universally better.
- **MI-42 - offers and benefits:** distinguish observed past cost,
  owner-confirmed entitlement, and live offer; never present expired or
  unverified eligibility as guaranteed.
- **MI-43 - time estimate:** show travel, wait, appointment duration, and owner
  effort only when supported; otherwise keep the current concise
  `time estimate not available yet` state.

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
