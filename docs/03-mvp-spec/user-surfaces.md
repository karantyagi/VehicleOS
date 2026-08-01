# User Surfaces — Owners (early access)

**Status:** Product principle (v1). See [ADR-005](../../docs-lite/adr/ADR-005-owners-only-positioning.md).

---

## The product

| | **Owners** |
|---|------------|
| **On site** | **Get early access** → [app.vehicleos.app](https://app.vehicleos.app) |
| **Tagline** | Let Vehicle OS work in the background. |
| **Wedge** | What's due next — plain-English why, from your service history |
| **Surfaces** | Web review and action app (live) · capture-first mobile web flow (live) · Vehicle OS Connect desktop (planned) |
| **Price (now)** | Free · early access |
| **Price (later)** | Subscription tiers when product matures |

**Hosted only** for early access — no self-host or Builders GTM on the marketing site.

See marketing site `#early-access`, `#positioning` (category gap cards), and workspace `strategy/user-surfaces.md`.

## Current surface boundary

- **Web:** the complete owner review desk for attention, maintenance history, schedule truth, imports, and corrections.
- **History:** one filterable timeline rail; owners can narrow the chronological record to service or RMV/DMV ownership events without leaving the history view.
- **First service:** a calm, non-dismissable baseline prompt appears only while there is no service history. It opens the service recorder and auto-completes after the first saved service; it is not a maintenance deadline.
- **Mobile:** camera/image capture with on-device crop and rotation, real-time voice transcript review, upload status, and a link to web review when needed.
- **Notifications:** deferred as a separate product and architecture track; current in-app attention is not notification delivery.

See [ADR-015](../../docs-lite/adr/ADR-015-owner-attention-and-deferred-notification-control.md) and the [owner product implementation queue](./product-implementation-queue.md).

## Maintenance item interaction

Maintenance items are quiet, owner-correctable assistant surfaces:

- collapsed by default;
- one status and one next action;
- only one item expanded at a time;
- evidence, recommendation confidence, and the four-axis rationale revealed by
  chevron;
- first expansion shows the complete owner-facing service journey: recorded
  service dots, current odometer, projected next service, and every matching
  service record with its date, mileage, shop, and line item;
- raw source metadata remains optional, but service history never requires a
  second expansion;
- owner interval entry always available after expansion;
- OEM, Assistant, and Owner intervals visibly distinguished;
- unfinished item intelligence labeled `Phase 2 · upcoming · in development`.

The owner interaction has two connected layers:

- **Attention item:** what needs attention, when, and why now.
- **Action recommendation:** how and where to complete it, expected time/cost,
  and why the option fits this owner.

Registration, state inspection, and future ownership deadlines use the same
attention model. Action recommendations never change the underlying due rule.

Owner-entered maintenance patterns are called **owner habits**. Text or voice
capture produces a structured interval proposal and always asks the owner to
confirm it before the schedule changes. The public proposal schema is shared by
the current deterministic extractor and the future LLM extractor.

Personal obligations such as a driver's-license renewal are **owner-level
compliance deadlines**. They appear in the same schedule/attention experience,
but are saved once on the owner account and are never attached to a car. The
deadline record intentionally omits the license number and date of birth.
The saved card proves the useful facts instead: issuing agency, license class,
expiration, source, and that it applies across the owner's garage. During an
RMV import, vehicle records and owner records appear in separate review groups.
An existing owner deadline never changes merely because another car is being
imported: the owner compares the saved and imported facts, then explicitly
chooses whether to keep the current deadline or use the imported update. The
earlier event remains in the private audit trail with the car-review context.

Rotate Tires is the first full item pilot. See
[`maintenance-item-intelligence.md`](./maintenance-item-intelligence.md) and
[ADR-014](../../docs-lite/adr/ADR-014-owner-centered-maintenance-item-intelligence.md).
See [ADR-016](../../docs-lite/adr/ADR-016-owner-habits-and-owner-level-compliance.md)
for owner-habit extraction and owner-level compliance boundaries.
