# Maintenance item intelligence

**Status:** Product specification for the Rotate Tires pilot  
**Decision:** [ADR-014](../../docs-lite/adr/ADR-014-owner-centered-maintenance-item-intelligence.md)  
**Implementation:** Documentation only; see the
[delivery queue](./maintenance-item-intelligence-queue.md)

---

## Owner goal

At a glance, answer two connected sets of questions:

1. **Reminder:** What needs attention, when, and why now?
2. **Action recommendation:** How and where should I get it done, for what
   expected time and cost, and why is this option right for me?

The owner should not need to read a paragraph to answer any of them.

Reminders include maintenance and ownership/compliance deadlines such as
registration and state inspection. Recommendations do not change what is due;
they help the owner complete it.

---

## What to keep from the CARFAX reference

| Keep | Improve in VehicleOS |
|---|---|
| Next due date and mileage | State which one controls the reminder and why |
| Progress since last service | Use one short `remaining` statement; avoid duplicate prose |
| Editable interval | Show OEM, Assistant, and Owner as distinct sources |
| Correct last service and odometer | Keep corrections in the item, not a separate settings hunt |
| Collapsed sections | Default every item to one quiet row |
| Recommended OEM interval | Add personalized rationale and confidence |

CARFAX is owner-correctable, but it behaves like a maintenance settings
dashboard. VehicleOS should behave like a quiet assistant: surface one decision,
show its receipts on demand, and return to the background.

---

## Information hierarchy

### Collapsed by default

```text
Rotate tires                            v
On track · due in 7,219 mi
OEM interval · 7,500 mi
```

Rules:

- one item name;
- one state line;
- at most one interval/source line;
- no paragraph;
- no action buttons until expanded, except a truly urgent primary action.

### Expanded Rotate Tires pilot

```text
Rotate tires                            ^
Last rotated 281 mi ago · next at 66,319 mi

Assistant recommends 7,000 mi
Medium confidence · 3 recent gaps · variable

[Use 7,000]   My interval [ 6,000 ] mi   [Keep OEM]

Recommended plan
Costco Tire Center · Waltham
Expected $0 · confirm included benefit
[Schedule online]   [Choose another]

Why this reminder
Vehicle & OEM       OEM 7,500 mi · verified TLX pack
Service history     Recent gaps: 7,360 · 7,982 · 5,594 mi
Owner use & preferences   Mileage-led · safety and tire life
Condition & setup   No inspect-sooner signal recorded

Recent average      6,979 mi
[Record rotation]   [Correct last service]
```

The figures above demonstrate the TLX dogfood presentation. Runtime values
must always come from structured evidence.

### Expanded item without recommendation support

```text
Rear differential fluid — SH-AWD        ^
Due in 467 mi

Why this reminder
Vehicle & OEM       SH-AWD · every 15,000 mi
Service history     Last confirmed at 44,567 mi
Owner use & preferences   Current 59,100 mi · 467 mi remaining
Condition & setup   SH-AWD applicability confirmed

Assistant recommendation
Phase 2 · upcoming · in development

[Done]   [Snooze]
```

`Phase 2 · upcoming · in development` appears only after expansion. Owners
still receive the deterministic OEM reminder while item-specific intelligence
is unfinished.

---

## Insight language by evidence count

There is no three-history minimum for an insight.

| Evidence | Show | Do not say |
|---|---|---|
| No confirmed rotations | OEM baseline; `No confirmed rotations yet` | `Your pattern` |
| One rotation | Last date/mileage | Gap, average, or habit |
| Two rotations | One observed gap | Average or habit |
| Three or more rotations | Gaps, recent average, range, variability | Stable habit unless stability is independently supported |

The current 15% stability signal becomes one confidence input. A failed
stability check produces `Recent gaps vary`; it does not suppress the insight.

---

## The four rationale axes

The axes are common. Their facts and evaluator are item-specific.

| Axis | Owner question | Rotate Tires examples |
|---|---|---|
| Vehicle & OEM | What applies to my exact car? | TLX pack, OEM 7,500 mi, tire layout |
| Service history | What actually happened to my car? | last rotation, gaps, source, corrections |
| Owner use & preferences | How is my car used, and what matters to me? | miles/year, road/climate/load, priorities, constraints |
| Condition & setup | Is there a reason to inspect sooner? | tread, TPMS, vibration, cupping, directional/staggered tires |

Each axis renders one short line and one state:

- available;
- missing;
- upcoming;
- not applicable.

Selecting an inspect-sooner condition creates context or an inspection action.
It does not silently rewrite the chosen mileage interval.

---

## Recommendation component

VehicleOS has two recommendation outputs:

1. an **interval recommendation** that may personalize the reminder cadence;
2. an **action recommendation** that proposes how and where to complete the
   already-due item.

### Required fields

```text
Assistant recommends: 7,000 mi
Rationale: Recent average is 6,979 mi; OEM is 7,500 mi.
Confidence: Medium · 3 recent gaps · variable
```

The full component contract needs:

- item/canonical service identity;
- recommended miles and/or months;
- recommendation status;
- qualitative confidence and evidence note;
- concise rationale assembled from structured facts;
- OEM baseline;
- owner override, if set;
- four rationale axes;
- data provenance;
- primary schedule basis;
- inspect-sooner signals;
- generated and confirmed timestamps.

The action recommendation additionally needs:

- fulfillment method;
- provider identity and location;
- expected time/effort;
- expected cost or range;
- discounts, memberships, warranties, or included benefits;
- owner-fit reasons and matched preferences;
- separate provider, cost, and booking confidence;
- verified booking/contact URL;
- confirmation requests for inferred facts.

### Source precedence

```text
Owner interval  >  accepted Assistant interval  >  OEM baseline
```

Precedence changes the reminder input, not the stored OEM truth. The current
source is always visible.

### Current build status

The requested per-item component is **not fully built**.

Already present:

- `IntervalProposal` with suggested miles/months, evidence text, and numeric
  confidence;
- an editable interval form for `VERIFY_OWNER_INTERVAL`;
- owner interval overlay memory;
- tire-specific inspect-sooner checkboxes;
- deterministic reminder and schedule projections.

Still missing:

- an always-available interval control on every item;
- facts/insight/recommendation separation;
- zero-, one-, and two-record insight states;
- qualitative owner-facing confidence;
- the four-axis rationale contract;
- a reusable collapsed/expanded per-item recommendation component;
- `Phase 2 · upcoming · in development` coverage for unfinished item policies;
- specific `Why now` operands on reminder rows.
- structured how/where/time/cost action recommendations;
- provider and offer evidence;
- explicit service-benefit and preferred-provider memory;
- verified booking links.

---

## Time versus money

The first action-ranking model treats time and money as the root tradeoff:

| Path | Potential advantage | Potential cost |
|---|---|---|
| DIY | Lower cash cost; owner control | Owner time, skill, tools, safety risk |
| Mobile service | Low travel time | Availability and service premium |
| Local specialist | Trust, expertise, possible value | Travel/wait and variable pricing |
| Tire retailer | Included tire benefits and tire-specific workflow | Membership/eligibility constraints |
| Dealer | Vehicle familiarity, recalls, current offers | Often higher list price; variable wait |

These are candidate attributes, not universal truths. Live provider facts,
discounts, and owner history decide the ranking.

### TLX Rotate Tires pilot

```text
What       Rotate tires
When       At 65,819 mi · about 6,719 mi remaining
How        Tire retailer service
Where      Costco Tire Center · Waltham
Cost       Expected $0 · confirm included benefit
Why        Current tires installed there; last 3 rotations there for $0
Owner fit  Safety and tire-life priorities
```

Confidence is compositional:

- timing: `Medium` because recent gaps vary;
- provider: `High` because the last three rotations used the same location;
- cost: `Medium` until the included benefit is owner-confirmed;
- booking: `Not verified` until a provider URL is cataloged.

---

## Shared engine, item policies

Use common orchestration and presentation with an evaluator per maintenance
item.

```text
OEM pack + owner events + current context
                  |
                  v
       shared evidence normalizer
                  |
                  v
        item-specific evaluator
       (Rotate Tires first)
                  |
                  v
   MaintenanceItemInsight contract
                  |
        +---------+---------+
        |                   |
        v                   v
 collapsed item       expanded rationale
```

Common rules own:

- evidence states;
- source labels;
- confidence vocabulary;
- owner override behavior;
- collapse/expand interaction;
- audit events;
- missing/upcoming presentation.

Item policies own:

- applicable evidence;
- primary schedule basis;
- safety and inspect-sooner signals;
- recommendation logic;
- item-specific rationale.

This avoids both a brittle universal formula and disconnected per-item UX.

---

## Trust and copy rules

- Prefer numbers and labels to paragraphs.
- Say `one observed gap`, not `average`, for two service records.
- Say `recent gaps vary`, not `not enough data`, when evidence is useful but
  inconsistent.
- Never say `habit` merely because a heuristic produced a value.
- Show `OEM`, `Assistant`, or `Owner` beside the active interval.
- Keep confidence qualitative and explain it with the evidence count/state.
- Put detail behind the chevron, not in every reminder.
- Never let LLM-written copy change an interval or due date.

---

## Success measures

- Owner can identify why a reminder exists within five seconds.
- Owner can set a tire-rotation interval in two interactions after expansion.
- No useful history disappears because of an evidence threshold.
- No one-gap observation is described as a habit.
- Every due value is traceable to an active interval and baseline.
- The collapsed list remains readable with dozens of maintenance items.
