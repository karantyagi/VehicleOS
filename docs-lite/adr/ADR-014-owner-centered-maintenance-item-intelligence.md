# ADR-014 - Owner-centered reminders and action recommendations

**Status:** Accepted (2026-07-30)

**Deciders:** Product / architecture

**Related:** ADR-002 (event-sourced domain model) · ADR-010 (deterministic service matching and OEM packs) · ADR-012 (catalog vs owner runtime) · ADR-015 (owner attention vs notification delivery)

**Implementation:** Rotate Tires pilot on `master`; exact-item completion,
correction, odometer, and navigation trust loop on
`agent/rotate-tires-trust-loop`

---

## Context

In this ADR, **reminder** means the deterministic in-app attention item. It does
not mean push, email, browser, or other notification delivery; ADR-015 owns that
separate boundary.

The current interval proposal combines three different decisions:

1. whether VehicleOS has a useful fact to show;
2. whether recent service gaps are stable enough to call a pattern; and
3. whether the assistant should propose an owner interval.

Before this pilot, `detectIntervalProposalForEntry` required at least three
matching service records and at least two recent gaps within 15% of their
median. If either condition failed, the proposal and its evidence both
disappeared.

The 2021 Acura TLX dogfood tire-rotation history shows why that is the wrong
owner experience. Earlier logic mixed rotation history from two tire sets and
produced gaps of 7,360, 7,982, and 5,594 miles. The current Michelin tire set
was installed at 39,390 miles, so its lifecycle intervals are 5,853, 7,982,
and 5,594 miles. Their average is 6,476 miles and their median is 5,853 miles.
The 7,982-mile interval is the high observation. The data is useful, but it is
not stable enough to call a habit.

CARFAX demonstrates several useful owner controls:

- next due date and mileage;
- progress since the last service;
- editable service interval;
- editable last service and odometer;
- collapsed detail sections.

Its maintenance view is also dense, repeats explanatory copy, and exposes a
generic interval setting without showing the evidence, recommendation
confidence, or whether OEM, assistant, or owner input is controlling the
reminder. VehicleOS should preserve the correction controls while adding an
auditable intelligence layer with less reading.

---

## Decision

### 0. VehicleOS has two connected owner jobs

VehicleOS separates the due decision from the fulfillment decision:

| Product job | Owner question | Output |
|---|---|---|
| **Reminder** | What needs attention, when, and why now? | A deterministic maintenance or ownership deadline |
| **Action recommendation** | How and where should I get it done, for what expected time and cost, and why this option? | A ranked, owner-specific fulfillment plan |

Reminders cover vehicle care plus ownership obligations such as registration,
state inspection, and future insurance/compliance deadlines. A reminder may be
mileage-led, date-led, or whichever comes first. VehicleOS may translate
mileage remaining into an estimated date, but it does not turn a mileage rule
into a calendar rule.

Action recommendations begin with the owner's time-versus-money tradeoff and
can later include:

- safety and job complexity;
- quality and provider trust;
- owner skill and available tools;
- distance, convenience, and appointment availability;
- warranty, membership, or included-service benefits;
- current discounts and promotions;
- prior owner experience and stated preferences;
- urgency and the risk of delay.

These factors are evidence, not stereotypes. VehicleOS does not assume that a
dealer is always faster or better, that DIY is always cheapest, or that a past
provider remains preferred.

The rationale axes explain **why the reminder exists**. They also supply
evidence to the action recommendation, but they do not replace its
`how / where / time / cost` output.

### 1. Facts, insights, recommendations, and owner decisions are separate

VehicleOS will not use a minimum-history rule to decide whether an item may
show an insight.

| Layer | Question | Can it be absent? |
|---|---|---|
| Fact | What records and OEM rules do we have? | No; show missing evidence explicitly |
| Insight | What does the available evidence say? | No; scale the language to the evidence |
| Recommendation | What interval does the assistant recommend? | Yes; show `Phase 2 · upcoming · in development` |
| Owner decision | What interval should VehicleOS use? | No; the owner can always set or restore it |

The existing three-record and 15% checks may remain inputs to confidence or
word choice. They must not suppress facts, descriptive insights, or the
owner's interval control.

### 2. Evidence language scales honestly from zero records

| Available evidence | Allowed owner-facing language |
|---:|---|
| No tire lifecycle evidence | "No confirmed rotations yet." Show the OEM baseline and owner control. |
| One rotation, installation unknown | Show the last rotation. Do not claim a gap or pattern. |
| Two rotations, or installation plus one rotation | Show one observed interval. Do not call it an average or habit. |
| Two or more observed intervals | Show intervals, median, average, range, and whether they vary. A stable-habit label requires separate evidence. |

An unstable series is an insight: "Recent gaps vary." It is not an error state.
When a tire installation or replacement is known, it starts a new evidence
window. Older rotations remain in history but do not determine the cadence for
the currently installed tire set.

### 3. Shared contract, item-specific policies

VehicleOS will use a hybrid architecture:

- one shared `MaintenanceItemInsight` contract for evidence, rationale axes,
  confidence, source labels, owner override, and presentation;
- item-specific evaluators because safe evidence differs for tire rotation,
  oil, brakes, fluids, and inspections;
- a shared deterministic schedule projector for due dates;
- a representative public `RotateTiresPolicy` contract first;
- tuned weights, thresholds, and production heuristics in private
  `vehicleos-engine`, consistent with the open-core boundary.

A single generic formula would erase item-specific safety and evidence. Fully
independent UI and data models would fragment trust language and owner control.

### 4. Every item explains the same four rationale axes

The expanded item view uses four stable axes:

1. **Vehicle & OEM** - applicable vehicle configuration, OEM rule, and source.
2. **Service history** - last confirmed service, observed gaps, and evidence
   provenance.
3. **Owner use & preferences** - miles driven, driving profile, climate, roads,
   load, priorities, constraints, and other item-relevant owner context.
4. **Condition & setup** - inspection or symptom signals and configuration,
   such as tread wear, TPMS, directional tires, or SH-AWD applicability.

Each axis has an evidence state: `available`, `missing`, `upcoming`, or
`not_applicable`. Missing evidence is never silently filled by a model.

### 5. Reminder and recommendation confidence remain distinct

An item recommendation contains:

- assistant interval, when implemented;
- short rationale;
- qualitative confidence: `High`, `Medium`, `Low`, or `Not scored`;
- evidence note, such as `3 current-tire intervals · variable`;
- recommendation status: `active`, `needs_input`, or `upcoming`;
- interval source: `OEM`, `Assistant`, or `Owner`.

Reminder confidence describes confidence in the due timing and baseline.
Interval confidence describes confidence in the personalized interval.
Action confidence describes confidence in the proposed provider/path, expected
cost, and owner fit. None replaces the existing due-date confidence
(`oem_calendar`, `mileage_converted`, or `needs_baseline`).

Exact decimal confidence values are internal diagnostics, not owner copy.

### 6. Action recommendations are structured, not a longer reason string

The shared action contract contains:

- **what** - the due item;
- **when** - due mileage/date and urgency;
- **how** - DIY, mobile service, tire retailer, local shop, or dealer;
- **where** - provider and location;
- **expected time** - travel, wait, appointment, and owner effort when known;
- **expected cost** - amount/range, benefit or discount, evidence, and
  confidence;
- **why this option** - concise owner-fit rationale;
- **next action** - verified booking/contact instruction when available;
- separate timing, provider, cost, and booking confidence;
- evidence IDs and facts that still need owner confirmation.

The first implementation may return one recommended plan plus alternatives.
Later implementations may rank multiple plans on a time-versus-money frontier.

### 7. Owner control is always available

The owner may:

- accept the assistant interval;
- type any valid mileage interval, such as 6,000 miles;
- keep or restore the OEM interval;
- add or correct the last service record;
- update current mileage;
- record inspect-sooner conditions.

The OEM value remains on file after an owner override. Changes are explicit,
auditable events; no heuristic or LLM silently changes schedule truth.

### 8. One quiet collapsed row is the default

Every maintenance item is collapsed by default and uses the existing
up/down-chevron interaction.

Collapsed state shows only:

- item name;
- status or distance/time remaining;
- active interval source and value, when useful;
- chevron.

Expanded state shows:

- last service and next target;
- interval recommendation, rationale, and confidence;
- action recommendation with how, where, expected time/cost, and owner fit;
- the four rationale axes;
- one primary action and owner correction controls.

Items without a completed evaluator show
`Assistant recommendation · Phase 2 · upcoming · in development` inside the
expanded view. The placeholder does not clutter the collapsed row.

### 9. Reminder rationale is deterministic and specific

"Your assistant projected this from OEM intervals and recent service" is not
enough. The expanded reminder must answer "Why now?" with the actual operands:

- which interval is active;
- which last service is the baseline;
- current/estimated mileage or date;
- remaining or overdue amount;
- which evidence is missing.

LLM may compress approved facts into short copy. It cannot choose the baseline,
interval, due date, confidence, or source label.

---

## Rotate Tires pilot

Rotate Tires is the first complete item policy.

- Mileage is the primary scheduling basis.
- Time may be shown as context but does not silently control the rotation
  reminder.
- All available history produces an appropriately worded insight.
- Current-tire median, average, and range are descriptive; variation lowers
  confidence rather than hiding the result.
- A recorded tire installation resets the recommendation evidence window.
- The representative pilot rounds the current-tire median to a practical
  500-mile interval. The average remains visible as context.
- Uneven tread, TPMS/pressure, pulling/vibration/cupping, and special tire setup
  are inspect-sooner signals. They do not silently shorten the saved mileage
  interval.
- The assistant may recommend a rounded mileage value; the owner can type a
  different value.

TLX dogfood example:

```text
Rotate tires                                      chevron up
Last rotated 281 mi ago

Assistant recommends 6,000 mi
Medium confidence · 3 current-tire intervals · variable

Current-tire intervals  5,853 · 7,982 · 5,594 mi
Median                 5,853 mi
Average                6,476 mi
OEM               7,500 mi

[Use 6,000 mi]   My interval [ 6,000 ] mi   [Keep OEM]
```

The exact production recommendation formula is intentionally not fixed in this
public ADR. It belongs behind the item-policy interface and its evals.

---

## Reminder rationale example

For the TLX rear differential reminder, the target expanded copy is:

```text
Why now
Current mileage is 59,100 mi. The next target is 59,567 mi: 467 mi away.

Vehicle & OEM       SH-AWD rule · every 15,000 mi
Service history     Last confirmed at 44,567 mi
Owner use & preferences   Mileage projection available
Condition & setup   SH-AWD applicability confirmed

Assistant recommendation · Phase 2 · upcoming · in development
```

Values must come from the live projection rather than hard-coded copy.

---

## Rotate Tires action-recommendation pilot

The TLX dogfood record contains enough evidence to propose a fulfillment plan:

- Michelin Pilot Sport All Season 4 tires were installed by Costco Tire Center
  in Waltham on 2025-01-06 at 39,390 miles;
- the next three recorded rotations were at the same Costco;
- all three rotation records show `$0.00`;
- no later tire-replacement event is recorded;
- owner memory prioritizes safety, handling, winter reliability, performance,
  and rejecting unmeasured upsells.

Target plan:

```text
Recommended plan
Where     Costco Tire Center · Waltham
How       Schedule a tire rotation
Cost      Expected $0 · benefit needs confirmation

Why this plan
These Michelin tires were installed at Costco.
Your last 3 rotations were completed there for $0.
This fits your safety and tire-life priorities.
```

The service records support the provider and observed-cost claims. They do not
prove a continuing free-rotation entitlement or a permanent owner preference.
The UI must label that fact as `Confirm benefit` until the owner verifies it.
A booking button requires a verified provider URL; history text never becomes
an external link by inference.

---

## Consequences

### Positive

- An honest low-confidence insight is more useful than a blank state.
- The owner can distinguish OEM truth, assistant interpretation, and their own
  chosen interval.
- The owner can distinguish why care is due from how to fulfill it.
- Every item explains reminders in a consistent vocabulary.
- Item-specific safety rules can evolve without fragmenting the UI contract.
- CARFAX-style correction controls remain, with less text and stronger
  rationale.

### Costs

- The shared intelligence and service-action contracts must remain compatible
  as each item-specific evaluator is added.
- Reminder views need structured evidence rather than a single reason string.
- Action recommendations need structured provider, time, cost, owner-fit, and
  confidence fields.
- Each maintenance item needs a policy implementation and evaluation fixtures.
- Confidence calibration requires product evals before broad rollout.

### Explicitly deferred

- Item evaluators beyond Rotate Tires.
- Tuned production scoring or thresholds in the public repository.
- Condition sensor integrations.
- Cross-owner learning.
- Live offer ingestion and provider appointment availability.

---

## Acceptance criteria

- No minimum number of records gates a Rotate Tires insight.
- No one-gap result is called an average or habit.
- Variable history remains visible and lowers confidence instead of
  disappearing.
- A known tire installation starts the current-tire evidence window; older
  rotations cannot influence the current tire-set interval recommendation.
- The TLX pilot recommends 6,000 miles from the 5,853-mile current-tire median
  and shows the 6,476-mile average as descriptive context.
- Owner interval entry is reachable without waiting for a verification task.
- Every item row is collapsed by default.
- Every expanded item exposes the four rationale axes.
- Unimplemented recommendations say `Phase 2 · upcoming · in development`.
- Reminder rationale states the active interval, baseline, current position,
  and remaining/overdue amount.
- Rotate Tires emits a structured Costco action plan from dogfood evidence.
- Rotate Tires completion prefills the exact service identity; correction opens
  the exact matched baseline and preserves unrelated lines from that visit.
- Odometer or baseline corrections immediately reproject the reminder.
- Observed `$0` history is not presented as a guaranteed entitlement until
  owner-confirmed.
- Reminder, interval, provider, cost, and booking confidence remain distinct.
- OEM, Assistant, and Owner interval sources are visually distinct.
- Schedule projection remains deterministic and replayable.
