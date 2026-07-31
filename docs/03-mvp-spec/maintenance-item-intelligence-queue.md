# Maintenance item intelligence delivery queue

**Scope:** Owner-facing maintenance items and reminder rationale

**Decision:** [ADR-014](../../docs-lite/adr/ADR-014-owner-centered-maintenance-item-intelligence.md)

**Pilot:** Rotate Tires

**Last updated:** 2026-07-31

This queue records the adopted direction and implementation status on
`agent/rotate-tires-trust-loop`. `Implemented` becomes
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
| MI-04 | Per-item recommendation and four-axis rationale component | Done | `MaintenanceItemIntelligence`, `maintenance-intelligence-summary.tsx` |
| MI-05 | Exact service-action context for completion and correction | Implemented | Canonical line item plus matched baseline ID/date/mileage |

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
| MI-19 | Add correction actions | Implemented | Record the exact item, repair the matched baseline, or update odometer in the expanded row; then recalculate |
| MI-20 | Add four-axis `Why this reminder` view | Implemented | Actual operands and evidence states |
| MI-21 | Add TLX dogfood/eval cases | Implemented | Current tire-set intervals 5,853 / 7,982 / 5,594; median 5,853; average 6,476; 6,000 recommendation |
| MI-22 | Add copy/trust regression tests | Partial | Domain tests cover evidence states; component tests now cover collapsed rationale and exact-item expansion; the full copy matrix remains |
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
| MI-39 | Deep-link target opens the relevant expanded reminder or schedule item | Partial: exact in-app targets implemented; notification delivery remains deferred by ADR-015 |
| MI-40 | Add provider catalog and verified action links | Partial: official Costco entry point only |
| MI-41 | Add time-versus-money option ranking | Phase 2: pilot emits one evidence-backed plan |
| MI-42 | Add offer/discount ingestion | Expiry, eligibility, source, and freshness required |
| MI-43 | Add evidence-backed appointment duration and owner-time estimate | Phase 2: never infer wait time from provider type |

### Phase 2 acceptance notes

- **MI-19 - corrections:** expanded items can add or repair the relevant service
  baseline and update the odometer without leaving the item; recalculation is
  deterministic and the edit is auditable. Implemented first for Rotate Tires.
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
- **MI-39 - navigation handoff:** the current app owns stable links that open
  the exact reminder or schedule item expanded. A future notification system
  may use those targets, but link routing does not implement delivery, cadence,
  permissions, retries, or channel controls.
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

## Per-item rollout backlog

Use **one parent rollout plus separate evaluator-family tasks**. Do not ship all
items in one change: evidence, primary schedule basis, inspect-sooner signals,
and safe fulfillment options differ by item. Do not create one ticket for every
line in an OEM inspection bundle either; rows that share one OEM trigger and
one inspection workflow can be implemented and evaluated as a family.

Every child task must deliver the same owner trust loop:

1. exact item and active due basis;
2. concise `Why now` plus the four rationale axes;
3. interval recommendation when evidence supports one, otherwise an honest
   `upcoming / in development` state;
4. action recommendation with how, where, time, cost, why, and owner fit;
5. exact completion/correction controls and deterministic recalculation;
6. public representative fixtures and methodology, with tuned scoring kept in
   `vehicleos-engine`.

| ID | Priority | Evaluator family | First acceptance fixture |
|---|---|---|---|
| MI-60 | P0 | Parent: maintenance-item policy rollout | Track child readiness, shared contract changes, cross-item copy, and regression gates |
| MI-61 | P0 / next | Rear differential fluid | TLX SH-AWD: prevent transmission/differential fluid mix-ups; explain the exact matched baseline before recommending action |
| MI-62 | P0 | Engine oil and oil-filter service | Reconcile Maintenance Minder A/B, oil-life/date/mileage evidence, and bundled filter work without inventing a fixed cadence |
| MI-63 | P0 | Brake inspection and wear service | Separate inspection from pads/rotors/fluid; condition and safety signals can trigger inspect-sooner without fabricating remaining life |
| MI-64 | P0 | Transmission and transfer fluid | TLX: canonical matching must exclude rear differential and engine fluids |
| MI-65 | P1 | Engine coolant replacement | Distinguish replacement history from level checks and use the applicable first/subsequent OEM rule |
| MI-66 | P1 | Brake-fluid replacement | Keep replacement separate from level checks and brake-wear service; support calendar-led rules |
| MI-67 | P1 | Engine air-cleaner element | Item-specific severe-use evidence plus replace-versus-inspect history |
| MI-68 | P1 | Cabin/dust-and-pollen filter | Owner comfort and air-quality preferences without overstating safety urgency |
| MI-69 | P1 | Drive-belt inspection | Inspection-led policy; findings, not elapsed mileage alone, control replacement advice |
| MI-70 | P1 | Spark plugs | Engine applicability, OEM minder basis, and prior replacement evidence |
| MI-71 | P1 | Valve-clearance inspection | Engine applicability and inspection outcome; never imply adjustment was completed from an inspection-only record |
| MI-72 | P1 | Steering, suspension, and driveshaft inspections | Shared Maintenance Minder B visit with distinct findings retained per component |
| MI-73 | P1 | Brake hoses, ABS/VSA, and fluid-condition inspections | Inspection evidence and findings remain separate from fluid replacement events |
| MI-74 | P1 | Exhaust, fuel-line, and emissions-warranty inspections | Inspection-first workflow with safety/emissions rationale and no unsupported repair recommendation |
| MI-75 | P1 | Tire condition, age, pressure, and repair-kit checks | Combine tire-lifecycle context while keeping rotation, replacement, condition, and kit expiry as distinct actions |
| MI-76 | P2 | Owner periodic/as-needed checks | Oil/coolant levels, lights, wipers, washer fluid, battery terminals, and remote battery use applicability and as-needed semantics with no false due precision |
| MI-77 | P0 | Registration renewal | Date-led reminder plus state-specific online/mail/in-person fulfillment plan and verified fees |
| MI-78 | P0 | State safety/emissions inspection | Jurisdiction and vehicle applicability, inspection window, nearby eligible providers, expected time, and verified cost |
| MI-79 | P2 | Additional ownership/compliance policies | Insurance or local obligations enter only with authoritative jurisdictional sources and explicit applicability |

Recommended order: MI-61, MI-62, MI-63, MI-64 through MI-66, MI-67 through
MI-75, MI-77 and MI-78, then low-frequency checks. Provider ranking and live
offers remain shared capabilities under MI-40 through MI-43 and should expand
only after each item computes the right reminder.

---

## Required implementation sequence

1. MI-10 through MI-14: contract and deterministic policy boundary.
2. MI-15 through MI-20: one complete reminder interaction.
3. MI-21 through MI-26: TLX interval and Costco action recommendation.
4. Dogfood Rotate Tires.
5. Complete the Rotate Tires correction/completion trust loop and copy checks.
6. Roll out MI-60 child policies in the documented order; each child ships and
   dogfoods independently.
