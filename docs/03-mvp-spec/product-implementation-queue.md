# Owner product implementation queue

**Updated:** 2026-08-04
**Scope:** Owner web attention and capture-first mobile
**Attention direction:** [ADR-018](../../docs-lite/adr/ADR-018-owner-attention-center-and-assistant-work-model.md) · [owner attention model](./owner-attention-model.md)
**Architecture:** [ADR-015](../../docs-lite/adr/ADR-015-owner-attention-and-deferred-notification-control.md) · [ADR-016](../../docs-lite/adr/ADR-016-owner-habits-and-owner-level-compliance.md)

This queue records adopted product direction. It does not authorize notification-system implementation.

## Current focus

| ID | Priority | Status | Task | Acceptance boundary |
|----|----------|--------|------|---------------------|
| WEB-ATTN-1 | P0 | Implemented | Replace owner-facing **Reminders** framing with a neutral home/attention framing | **Home** answers what needs action this week without promising push delivery |
| WEB-ATTN-2 | P0 | Implemented | Remove the obsolete per-item delay feature end to end | Production contains no related events; domain contracts, projections, APIs, tests, UI compatibility, and product copy no longer carry the feature |
| WEB-ATTN-3 | P0 | Implemented | Define the web action lifecycle | Scheduled and completed are distinct persisted states; Done completes its Home item only after the service record saves; Fix this reprojects corrected history; Not needed is not recreated by a no-change refresh |
| WEB-ATTN-4 | P0 | Implemented | Present attention by owner time horizon | This week leads; next week and this month support planning; overdue work remains in This week |
| WEB-ATTN-5 | P1 | Implemented | Keep maintenance truth available behind the attention summary | Full history, actual due dates, evidence, and long-range schedule remain under Maintenance |
| WEB-ATTN-6 | P0 | Implemented | Retire automatic browser-notification behavior from the current owner slice | The notification-permission hook and automatic browser delivery were removed |
| WEB-ATTN-7 | P0 | Implemented | Make completion and correction item-aware | Done prefills the exact service; Fix this opens the matched baseline or a prefilled missing record; a successful save reprojects the item |
| WEB-ATTN-8 | P1 | Implemented | Add stable exact-item navigation targets | Query links can open and focus one reminder or maintenance row; this is routing only, not notification delivery |
| WEB-ATTN-9 | P1 | Implemented | Treat the first-service prompt as onboarding, not a due task | It has no invented deadline or dismiss controls, takes precedence over an unanchored OEM interval, opens the service recorder, and auto-completes after the first saved service entry |
| WEB-IA-1 | P1 | Superseded by ATTN-1 | Simplify persistent owner navigation | The earlier three-surface model is replaced by the accepted **Home / Your attention / Maintenance / Add records** model in ADR-018 |
| WEB-IA-2 | P1 | Implemented | Remove redundant owner labels and demote developer controls | Vehicle and driving settings live under **Your garage**; the account menu no longer duplicates that route; developer tools are an intentional secondary control rather than a peer owner view |
| WEB-PROFILE-1 | P1 | Implemented | Make vehicle and driving profiles seamless owner surfaces | The garage record loads once behind a neutral skeleton; saved details render read-only first, and an explicit Edit action reveals a cancellable form without flashing default choices |
| WEB-VERIFY-1 | P0 | Superseded by ATTN-2 | Separate blocking from advisory owner verification | The former rare/context-only verification model is replaced by **Help the assistant** in the permanent Your attention surface |
| WEB-VERIFY-2 | P0 | Superseded by ATTN-1/2 | Deep-link verification to maintenance truth | Stable deep links remain; the target model makes each item available in both Your attention and its related source context |
| WEB-VERIFY-3 | P1 | Implemented | Preserve verification accountability | Resolved confirmations remain available in a collapsed Maintenance history audit trail |
| WEB-HISTORY-1 | P0 | Implemented | Keep imported history owner-correctable | The unified history timeline supports manual edits and only offers manual merge for deterministic consecutive duplicate candidates |
| MOBILE-CAP-0 | P1 | Implemented | Choose the smallest capture delivery shell | The existing responsive PWA is the capture shell; no native app dependency was introduced |
| MOBILE-CAP-1 | P1 | Implemented | Specify the capture-only mobile flow | Vehicle target, photo/PDF, minimal voice note, upload progress, retry, and success are covered |
| MOBILE-CAP-2 | P1 | Implemented | Link uncertain captures to web review | Queued or conflicting captures expose an explicit **Review on Home** handoff instead of expanding mobile review |
| MOBILE-CAP-3 | P1 | Implemented | Add a deliberate photo-review step before upload | Camera photos can be dragged to crop, zoomed, rotated, reset, replaced, or uploaded unchanged; editing stays on-device until the Owner confirms |
| MOBILE-CAP-4 | P1 | Implemented | Make voice transcription visibly real time | Listening state, live transcript, stop-and-review, correction, start-over, and review-before-save are explicit; unsupported browsers retain typed-note fallback |
| OWNER-HABIT-1 | P0 | Implemented | Capture an owner habit by text or browser voice transcription | Rules produce `OwnerHabitProposalV1`; future LLM extraction must return the same public contract |
| OWNER-HABIT-2 | P0 | Implemented | Require approval before an owner habit controls a schedule | Every extracted interval enters `VERIFY_OWNER_INTERVAL`; no proposal mutates schedule truth directly |
| OWNER-COMPLIANCE-1 | P0 | Implemented | Model driver's-license renewal once per owner | `owner.driver_license.recorded` is owner-scoped, excludes license number/date of birth, and projects into the shared due-item model; its trust card shows agency, class, expiration, source, and owner scope instead |
| RMV-OWNER-1 | P0 | Implemented | Route mixed RMV facts to the correct aggregate | Registration/inspection remain vehicle records; driver's-license expiration is written to the authenticated owner only after an explicit comparison-and-confirmation when it would change an existing owner deadline |
| DOGFOOD-SELECT-1 | P1 | Implemented | Select between TLX and Elantra fixtures during CARFAX/RMV import | Both profiles are visible; VIN or YMM matching prevents cross-car imports; synthetic deadline fixtures exercise upcoming schedule items |

## Owner attention center rollout

**Status:** Slice 1 is implemented in PR #101; deployment and owner dogfood are pending.

**Canonical behavior:** [owner attention model](./owner-attention-model.md)

Each code slice must be independently reviewable, deployed, and dogfooded by
the owner before the next slice begins. Completing a prior slice does not
authorize the next one; owner feedback may change the remaining sequence.

| ID | Priority | Status | Task | Deployment and owner acceptance boundary |
|----|----------|--------|------|------------------------------------------|
| ATTN-0 | P0 | Implemented in PR #101 | Record vocabulary, surface roles, attention policy, progressive disclosure, and notification boundary | Product direction is reviewable in ADR-018 and `owner-attention-model.md`; no UI or domain behavior changes in this slice |
| ATTN-1 | P0 | Implemented — owner dogfood pending | Add the **Your attention** navigation route and stable targets for current unresolved owner work | Exposes existing car actions and assistant questions under distinct labels on shared task state. Home remains unchanged until the next delivery slice; no notification delivery. |
| ATTN-2 | P0 | Next after ATTN-1 dogfood | Group existing verify/personalize work as **Help the assistant** and retain one shared resolution state across source context and attention | After deployment, imported-record questions are clear, answerable, and never duplicated; the owner explicitly approves the interaction before the next slice |
| ATTN-3 | P0 | Next after ATTN-2 dogfood and schedule-semantic prerequisites | Group actionable reminders as **Act for your car**, make Home a calm summary linked to the full queue, and add the **Next Care Brief** | After deployment, the brief gives one compact, source-grounded next-care explanation without replacing the full queue. It does not present a mileage forecast as an actual due date, and only describes an earlier trigger when the OEM source explicitly supports it. Home remains reassuring while Your attention shows all open work; no arbitrary item truncation or auto-expanded pile of details |
| ATTN-4 | P1 | Next after ATTN-3 dogfood | Add compact item-level callouts in Maintenance and move long evidence/history into deeper reveals | After deployment, the owner can act from Maintenance without losing access to the service journey and records |
| ATTN-5 | P1 | Deferred product discovery | Research notification cadence, channels, interruption policy, and owner controls using the proven attention model | Separate decision before any notification delivery build |

## Schedule semantics and demo evidence

These are prerequisites for the Next Care Brief. The existing calendar-first
behavior remains the default until a source-backed semantic says otherwise.

| ID | Priority | Status | Task | Acceptance boundary |
|----|----------|--------|------|---------------------|
| OEM-SEM-1 | P0 | Next before ATTN-3 | Carry an explicit OEM trigger semantic through the schedule contract and projector | The runtime can distinguish at least calendar-first, mileage-only, source-backed earlier-of, and minder-or-condition behavior. A mileage forecast never rewrites a hard calendar schedule; it may explain planning only. Only an OEM entry explicitly marked earlier-of can identify the earlier expected trigger. Tests cover each semantic and current calendar-first behavior remains the fallback for unclassified packs |
| OEM-SEM-2 | P0 | Next before ATTN-3 | Preserve OEM `itemType` from source extract through the validated runtime pack | The runtime pack and public schedule contract retain source values such as inspect, replace, and rotate without reconstructing them with an LLM. Validation and fixture tests prove the field survives extraction, loading, and projection |
| DEMO-OEM-1 | P0 | Next before ATTN-3 | Audit the Hyundai Elantra demo schedule pack against its OEM evidence | Every demo item used by the owner flow has a traceable source, interval, trigger semantic, and `itemType`; missing or ambiguous source evidence is visible to maintainers and does not support a misleading Next Care Brief claim |

## Explicitly deferred

| ID | Status | Task | Prerequisite |
|----|--------|------|--------------|
| NOTIFY-DESIGN-1 | Deferred | Research owner expectations for cadence, quiet hours, overdue nudges, and control | User-centered notification research |
| NOTIFY-DESIGN-2 | Deferred | Design notification domain contracts and delivery architecture | Accepted product behavior from NOTIFY-DESIGN-1 and the deployed attention-center routing model |
| NOTIFY-DESIGN-3 | Deferred | Decide channels: browser, push, email, or combinations | Permission, privacy, cost, and reliability assessment |
| NOTIFY-DESIGN-4 | Deferred | Define future mute/defer semantics | Separate attention state, actual due time, and next allowed nudge |
| NOTIFY-BUILD | Blocked by design | Implement notification delivery and user controls | NOTIFY-DESIGN-1 through NOTIFY-DESIGN-4 accepted |
| OWNER-HABIT-LLM | Deferred | Expand natural-language habit extraction beyond the deterministic Techron pilot | Private tuned prompt/evals that emit the public `OwnerHabitProposalV1` schema |
| QUOTE-CONTAIN-1 | Next containment slice | Hide quote analysis from the active product and disable new analysis | No Owner or Developer surface presents quote analysis as an available capability, and no new analysis can be started. Existing stored evidence is retained rather than deleted or rewritten |
| QUOTE-EXEC-1 | Far future / blocked | Reconsider quote analysis only within an owner-authorized execution assistant | First establish trusted recommendations, explicit per-action owner approval, constrained tool permissions, provenance, cost/merchant safeguards, audit history, cancellation, and recovery. The assistant may then execute on the owner's behalf after a recommendation; quote analysis is not an early standalone feature |

## Guardrails

- Do not treat in-app attention lists, banners, or action feedback as notification delivery.
- Do not hide open owner work behind an arbitrary Home or attention-list item cap; use compact rows and progressive disclosure instead.
- Do not duplicate an owner decision between Your attention and Maintenance, History, or Add records; every contextual callout resolves the same underlying item.
- Do not show optional recommendations in Your attention unless the assistant genuinely needs an owner decision.
- Deep-link targets may be implemented before notification delivery, but they must not imply that cadence, channel, permissions, or delivery reliability exist.
- Do not let notification preferences modify maintenance history or actual due dates.
- Do not add per-item delay controls as part of web-attention work.
- Do not change a schedule globally to "whichever occurs first". Respect the OEM entry's explicit trigger semantic; calendar-first is the compatibility default.
- Do not expose or run quote analysis while `QUOTE-CONTAIN-1` is incomplete. Retaining prior evidence does not make the feature active.
- Do not expand mobile into a second full review application during the capture phase.
- Do not let voice, rules, or LLM extraction silently change an owner interval.
- Do not store a driver's-license number or date of birth in the compliance-deadline contract.
- Do not attach personal compliance deadlines to a vehicle aggregate.
