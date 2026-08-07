# ADR-020 - Text-first service-note capture with optional browser dictation

**Status:** Accepted; implemented (2026-08-07)

**Deciders:** Product / architecture

**Related:** [ADR-015](./ADR-015-owner-attention-and-deferred-notification-control.md) · [ADR-016](./ADR-016-owner-habits-and-owner-level-compliance.md) · [Product implementation queue](../../docs/03-mvp-spec/product-implementation-queue.md)

## Context

The capture-first PWA needs a low-friction way for an owner to record a completed service when they do not have a receipt. The initial implementation put voice language and UI first, although the resulting record was already reviewable text. That makes microphone availability feel required, obscures the fastest path for many owners, and incorrectly represents typed input as voice provenance.

This decision is deliberately about record capture. It does not establish a general conversational VehicleOS assistant, a ChatGPT connector, a WhatsApp integration, hosted audio processing, or a new notification channel.

## Decision

1. **An editable service-note text field is the canonical PWA capture surface.** The owner can type what happened, then review and correct the text before saving. An unfinished PWA note, including an optional changed date or mileage, is kept only in browser storage scoped to that vehicle; it is restored after an accidental reload and can be discarded. It is not a service record or uploaded evidence.
2. **Browser dictation is optional input assistance.** When supported by the browser, the owner can choose **Dictate instead**. Dictated words fill the same editable field and follow the same review-and-save path. Missing microphone permissions or speech-recognition support never block text capture.
3. **Capture provenance is explicit.** Typed service notes store document channel `manual` and service source `owner_note`. A note filled through browser dictation retains document channel and service source `voice`. Both retain the saved text artifact and existing evidence link.
4. **The current deterministic parser and owner-review boundary remain in force.** This slice has no LLM call. A mobile owner may optionally supply a changed date or mileage; otherwise the parser uses its existing defaults. Parsed shop, date, mileage, line items, and total remain owner-correctable, while conflicts continue to hand off to the web review surface.
5. **Mobile remains capture-only.** The PWA does not gain a second history, attention, notification, chat, or workflow-recommendation surface.

## Consequences

### Positive

- Text capture works on every supported PWA browser, including those without speech recognition.
- An accidental PWA reload does not throw away an in-progress note, without creating a second cloud record or expanding the capture surface into offline sync.
- Owners have one understandable record to inspect before it becomes maintenance history.
- Audit history distinguishes manual text from browser dictation without inventing a server-side audio pipeline.
- The slice avoids model cost, latency, data-sharing, and evaluation obligations where deterministic parsing and owner review already meet the need.

### Negative

- Browser dictation quality depends on the owner's browser and device.
- The existing deterministic parser remains intentionally narrow; it may require owner correction.
- A later general-language or messaging experience would need its own public contract, privacy boundary, evaluation plan, and explicit product decision.

## Alternatives considered

### Keep voice-first capture

Rejected. It makes optional hardware and browser support appear central to a flow whose durable output is text.

### Add a hosted realtime/LLM service now

Rejected. The current task is capture and owner review. A model service would add privacy, cost, latency, reliability, and evaluation responsibilities without solving a demonstrated capture gap.

### Connect ChatGPT or WhatsApp to VehicleOS

Deferred. A bidirectional connector would require authentication, authorization, data retention, identity, audit, message-delivery, recovery, and product-surface decisions beyond the PWA capture scope.
