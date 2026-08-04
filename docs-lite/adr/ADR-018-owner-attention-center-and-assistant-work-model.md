# ADR-018 — Owner attention center and assistant work model

**Status:** Accepted (2026-08-04)
**Deciders:** Product / architecture
**Related:** [ADR-011](./ADR-011-import-enrichment-assistant-review-and-shop-memory.md) · [ADR-014](./ADR-014-owner-centered-maintenance-item-intelligence.md) · [ADR-015](./ADR-015-owner-attention-and-deferred-notification-control.md)

## Context

VehicleOS must give an owner enough evidence to trust its maintenance guidance
without making the owner inspect a dashboard. The earlier web-attention model
assumed verification would stay rare and context-only. That does not scale to
multiple imported records, a growing number of owner-preference questions, or
several maintenance decisions that are simultaneously active.

The product must distinguish two directions of work:

- the assistant tells the owner that their car needs an action; and
- the assistant asks the owner for information it cannot safely infer.

Those are different relationships and must not share vague `attention` copy or
a single undifferentiated list. The model must remain ready for a later
notification system without claiming that notification delivery exists now.

## Decision

### 1. Use five owner-facing information types

| Type | Owner meaning | Default location |
|------|---------------|------------------|
| **Act** | Your car needs something from you. | Your attention |
| **Verify** | Validate a fact before VehicleOS relies on it. | Your attention and its source context |
| **Personalize** | Answer a question that will tailor your plan. | Your attention and its related plan context |
| **Consider** | VehicleOS has a recommendation; no answer is required yet. | Related maintenance item |
| **Understand** | See why VehicleOS said or asked this. | On demand |

`Verify` is an integrity boundary, not a generic trust exercise. `Personalize`
is a learning boundary, not a hidden data-collection request. Trust is the
result of clear requests, visible consequences, and evidence on demand; it is
not a destination or an owner-facing task category.

### 2. Give each persistent owner surface one job

| Surface | Job |
|---------|-----|
| **Home** | A calm overview of what is happening now, including compact attention counts and the next relevant care item. |
| **Your attention** | The complete, persistent queue of unresolved owner work. |
| **Maintenance** | The long-term care plan, item recommendations, and exploration. |
| **Add records** | Capture/import evidence and resolve newly discovered review work at its source. |

`Your attention` is a permanent owner navigation destination. It replaces the
assumption in ADR-015 section 3 that owner verification must never have a
permanent destination. It is not an email-like inbox: it is a focused assistant
work surface with only unresolved owner work.

### 3. Group all open work; do not hide it behind an arbitrary count

Your attention has two top-level groups:

```text
Act for your car
Help the assistant
```

`Act for your car` contains time-, safety-, cost-, or care-relevant owner
actions. `Help the assistant` contains `Verify` and `Personalize` questions.
All open items in both groups remain visible as compact, collapsed rows. The
interface may group or filter them, but it must never silently truncate the
owner's unresolved work behind a small `See more` limit.

Only one item is expanded at a time. The selected item receives a clear focus
outline and a subtle tinted surface. Its first expansion answers only:

1. what this is;
2. what the owner can do now; and
3. why VehicleOS is showing it now.

Service history, source records, heuristics, full rationale, and audit details
are an explicit deeper reveal. This supersedes the user-surface rule that the
first maintenance expansion must render every matching service record.

### 4. Keep one question, action, and resolution state across contexts

An attention item can appear in two places without becoming two tasks:

- the authoritative item is in **Your attention**;
- a compact, linked callout appears in the related Maintenance item, History
  record, or Add records review flow.

Resolving it anywhere resolves the same underlying owner-work state.

### 5. Home is selected by attention policy, not only calendar week

Home is not a duplicate queue and is not limited to `This week`. It surfaces a
compact summary when at least one of these is true:

- a car action is due, overdue, safety- or compliance-relevant, or inside its
  defined planning window;
- a `Verify` question blocks VehicleOS from relying on a fact;
- a `Personalize` answer would materially change a current plan;
- an import introduced review work; or
- an owner began but did not finish a relevant action.

Future work that has not entered its planning window remains in Maintenance as
the next-up plan, not as a Home interruption. When no attention policy applies,
Home reassures the owner that they are all set and shows one quiet next-up item.

### 6. Recommendations and evidence stay in context

Recommendations are not automatically attention items. A recommendation such
as a personalized tire interval stays with its maintenance item unless the
assistant genuinely needs an owner decision. Each recommendation states a
plain-language basis before the owner acts. Confidence and raw heuristics are
shown when they alter the decision or after the owner chooses `Why this?` or
`See evidence`; they are not decorative default chrome.

### 7. Be ready for notifications without implementing them

The future notification product may consume the same attention items. Before
delivery work is considered, each item needs a stable target, type, owner and
vehicle context, urgency/due context, and open/resolved state. This is an
attention-routing boundary only. It does not add push, email, browser delivery,
cadence, quiet hours, retries, permissions, or notification preferences.

ADR-015's separation of maintenance truth, owner attention, and notification
delivery remains in force. Its deferred notification controls remain deferred.

## Consequences

### Positive

- Owners can scan all unresolved work without processing every detail.
- Car actions and assistant questions use unambiguous language and visual
  grouping.
- The same owner decision is discoverable globally and in vehicle context
  without duplicate state.
- The product has a stable destination and deep-link contract for future
  notification research and delivery.

### Costs and constraints

- Navigation gains one owner surface and must be introduced without making
  Home feel like a dashboard.
- Existing contextual verification and expansive maintenance-item layouts need
  staged migration rather than one rewrite.
- The attention selection policy needs explicit per-item planning windows;
  `this week` alone is insufficient.
- Notification delivery stays out of scope until its separate product design is
  accepted.

## Alternatives considered

### Keep verification rare and context-only

Rejected. It hides an increasing amount of owner work and makes the top-level
attention count hard to inspect.

### Make Home the full owner queue

Rejected. Home should reassure and orient. A complete queue needs a durable
surface where many compact items can be reviewed without making the home screen
feel like work.

### Create separate navigation for questions and recommendations

Rejected. `Verify` and `Personalize` belong together as assistant questions.
Recommendations belong with the related maintenance item unless they require a
decision. More destinations would add cognitive overhead.

### Build notification delivery with the attention center

Deferred. Delivery needs independent research and controls; this decision only
makes future deep links and item routing possible.
