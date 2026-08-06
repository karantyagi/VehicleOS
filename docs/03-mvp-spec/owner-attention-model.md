# Owner attention model

**Status:** Accepted product direction; Slices 0-1 merged in PR #105 and Slices 2-4 implemented in the owner-attention completion PR

**Decision:** [ADR-018](../../docs-lite/adr/ADR-018-owner-attention-center-and-assistant-work-model.md)

VehicleOS is a quiet personal assistant, not a maintenance dashboard. It
monitors vehicle details, asks the owner only when the owner is uniquely
needed, and keeps evidence available without forcing it into view.

This is the canonical vocabulary and behavior for owner-attention work. It
describes the delivered web interaction model; notification discovery and
delivery remain separate, deferred product decisions.

## Owner promise

VehicleOS lets an owner answer three questions quickly:

1. **Do I need to do anything for my car now?**
2. **Does the assistant need an answer from me?**
3. **Why is it telling or asking me this?**

The owner should not need to open a maintenance dashboard, inspect confidence
labels, or read a service-history table to answer the first two.

## Locked vocabulary

| Product term | Meaning | Never use it for |
|--------------|---------|------------------|
| **Act for your car** | A real-world action the owner should take or arrange. | An uncertain imported fact. |
| **Help the assistant** | A question only the owner can answer. | A generic task list or claim about trust. |
| **Verify** | Confirm or correct a fact before VehicleOS relies on it. | A suggestion the owner may ignore. |
| **Personalize** | Provide information that makes the plan more useful. | Silent preference collection. |
| **Consider** | An optional recommendation. | An urgent reminder. |
| **Why this? / See evidence** | On-demand rationale, sources, and confidence. | Default card content. |
| **Your attention** | The list of all unresolved actions and questions. | Notification delivery or an email-style inbox. |

Trust is not an owner-facing bucket. It is earned when VehicleOS clearly says
what it knows, what it does not know, what the owner can do, and what will
change after the answer.

## Surface roles

| Surface | Job |
|---------|-----|
| **Home** | Calm overview: compact attention counts and the next relevant care item. |
| **Your attention** | Review every unresolved action or assistant question. |
| **Maintenance** | Explore the long-term care plan and item-specific recommendations. |
| **Add records** | Capture/import evidence and resolve uncertainty at its source. |

### Home — orient, do not overwhelm

Home is a summary, not the full queue. It can show compact counts for Act for
your car and Help the assistant, the most time-relevant item when direct focus
is helpful, a quiet next-up item, or an All set state. It links to the full
Your attention surface.

Home does not hide active work, but it does not auto-expand a pile of forms,
recommendations, or evidence.

### Your attention — review all unresolved work

Your attention is a permanent owner navigation destination. It shows every
open item, grouped as **Act for your car** and **Help the assistant**.

Rows are compact, collapsed, and sortable by urgency. The owner can scan every
open item even when there are five or ten. The interface may filter or group;
it must not use an arbitrary small-item cap that makes unresolved work
invisible.

The owner opens one row at a time. The active row has a stronger outline and a
subtle tinted surface. It answers:

1. What is this?
2. What can I do now?
3. Why is VehicleOS showing this now?

Review later keeps an unresolved fact out of trusted history or leaves a
personalization question unanswered; it never silently accepts, dismisses, or
rewrites the underlying truth.

### Maintenance and Add records — preserve source context

Maintenance owns the long-term plan, future care, and item recommendations. A
recommendation stays there unless the assistant genuinely needs a decision.
Add records remains the first place to review new import uncertainty.

Each context can show a compact linked callout to the same attention item. It
does not create a second decision or a second resolution state.

## Attention policy

Home and Your attention are selected by owner relevance, not just calendar
week. An item is eligible when it is one of the following:

| Condition | Type | Example |
|-----------|------|---------|
| Due, overdue, safety/compliance relevant, or inside the planning window | Act | Schedule a soon-due service. |
| VehicleOS cannot safely rely on a material fact | Verify | Confirm a DIY service record. |
| The answer would materially change the current plan | Personalize | Confirm a tire-rotation benefit. |
| New evidence created review work | Verify | Resolve an imported record conflict. |
| The owner began but did not finish an action | Act | Finish saving a corrected service. |

Future context stays in Maintenance until it enters its planning window. A
recommendation that can wait is Consider, not attention.

## Progressive disclosure and trust

The owner receives breadth before depth:

1. **Compact row:** item name, plain state, one timing or consequence line.
2. **Focused expansion:** action choices and one short why-now explanation.
3. **Evidence reveal:** source records, service journey, confidence rationale,
   heuristics, and audit details.

High-confidence deterministic reminders do not need a decorative confidence
badge by default. When uncertainty materially affects a decision, VehicleOS
must say what is uncertain, why, and what the answer will change.

Example:

> Are Costco tire rotations still included with this purchase?
>
> This changes the estimated cost of your next rotation.
>
> **Yes, still included** · **No** · **I am not sure**
>
> Why am I being asked? · See evidence

## Notification readiness, not delivery

Future notifications must open the same item an owner can already find in the
web app. Each item needs a stable deep link, type, related vehicle/item,
urgency context, and lifecycle state. This permits a future message such as:

> VehicleOS: one quick question about your tire rotations.

It does **not** implement channels, permissions, quiet hours, cadence,
deduplication, retries, or delivery records. Those remain a separate product
track under ADR-015.

## Deployable implementation slices

Every code slice ships independently, is deployed, and is dogfooded by the
owner before the next slice begins. No later slice is assumed approved merely
because this model is accepted.

| Slice | Scope | Owner test after deployment | Not included |
|-------|-------|-----------------------------|--------------|
| **0 — Direction** | ADR, vocabulary, surface model, and delivery plan. | Review the documented model and terminology. | UI or domain changes. |
| **1 — Attention foundation** | Your attention route and stable links to current owner work. | Can I find every unresolved item and return to its source? | Notifications or new recommendation logic. |
| **2 — Questions** | Existing Verify/Personalize work as Help the assistant; one focused question at a time. | Are questions obvious, answerable, and never duplicated? | Broad maintenance-card redesign. |
| **3 — Car actions and Home** | Act for your car and a compact Home linked to the full queue. | Is Home calm while Your attention shows all work? | Push/email/browser notifications. |
| **4 — Maintenance context** | Item callouts plus focused decision and deeper evidence reveal. | Can I act without losing service history access? | New evaluators or provider integrations. |
| **5 — Notification discovery** | Research cadence, channels, controls, and delivery semantics. | Decide whether and how VehicleOS may interrupt me. | Delivery implementation. |

## Current implementation status

Slices 2-4 are delivered together in the owner-attention completion PR:

- **Questions:** Verify and Personalize are distinct, context-specific question
  types. Every unresolved question remains visible as a compact row; one can
  be focused at a time. `Review later` closes the row without resolving,
  accepting, or dismissing anything.
- **Home and actions:** Home shows one primary next step plus compact counts
  for **Act for your car** and **Help the assistant**. It links to the full
  unresolved queue rather than rendering it again.
- **Maintenance context:** History and schedule callouts open the same shared
  question in Your attention. Service journeys are evidence on demand rather
  than default card content.

These surfaces use existing lifecycle items only. They do not make a new OEM
forecast or trigger-semantic claim. That separate schedule work remains a
follow-up before any future forecast-oriented Next Care Brief.

## Product guardrails

- Never silently accept unverified imported evidence.
- Never use attention to imply a push, email, or browser notification was
  delivered.
- Never show an optional recommendation as an urgent action.
- Never make the owner hunt through a maintenance card to discover an open
  assistant question.
- Never duplicate an owner decision because it appears in global and contextual
  surfaces.
- Never show all evidence by default when a concise explanation is enough.
- Never hide unresolved work merely to make Home look calm.
