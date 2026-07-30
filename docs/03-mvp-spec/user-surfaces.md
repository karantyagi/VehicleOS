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
- **Mobile:** image and voice-note capture with upload status and a link to web review when needed.
- **Notifications:** deferred as a separate product and architecture track; current in-app attention is not notification delivery.

See [ADR-015](../../docs-lite/adr/ADR-015-owner-attention-and-deferred-notification-control.md) and the [owner product implementation queue](./product-implementation-queue.md).

## Maintenance item interaction

Maintenance items are quiet, owner-correctable assistant surfaces:

- collapsed by default;
- one status and one next action;
- evidence, recommendation confidence, and the four-axis rationale revealed by
  chevron;
- owner interval entry always available after expansion;
- OEM, Assistant, and Owner intervals visibly distinguished;
- unfinished item intelligence labeled `Phase 2 · upcoming · in development`.

The owner interaction has two connected layers:

- **Attention item:** what needs attention, when, and why now.
- **Action recommendation:** how and where to complete it, expected time/cost,
  and why the option fits this owner.

Registration, state inspection, and future ownership deadlines use the same
attention model. Action recommendations never change the underlying due rule.

Rotate Tires is the first full item pilot. See
[`maintenance-item-intelligence.md`](./maintenance-item-intelligence.md) and
[ADR-014](../../docs-lite/adr/ADR-014-owner-centered-maintenance-item-intelligence.md).
