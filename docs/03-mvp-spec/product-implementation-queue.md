# Owner product implementation queue

**Updated:** 2026-08-03
**Scope:** Owner web attention and capture-first mobile
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
| WEB-ATTN-9 | P1 | Implemented | Treat the first-service prompt as onboarding, not a due task | It has no invented deadline or dismiss controls, opens the service recorder, and auto-completes after the first saved service entry |
| WEB-IA-1 | P1 | Implemented | Simplify persistent owner navigation | Owner navigation is **Home**, **Maintenance**, and **Add records**; rare verification appears contextually on Home |
| WEB-IA-2 | P1 | Implemented | Remove redundant owner labels and demote developer controls | Vehicle and driving settings live under **Your garage**; the account menu no longer duplicates that route; developer tools are an intentional secondary control rather than a peer owner view |
| WEB-PROFILE-1 | P1 | Implemented | Make vehicle and driving profiles seamless owner surfaces | The garage record loads once behind a neutral skeleton; saved details render read-only first, and an explicit Edit action reveals a cancellable form without flashing default choices |
| WEB-VERIFY-1 | P0 | Implemented | Separate blocking from advisory owner verification | Blocking questions lead Home; advisory questions follow maintenance attention; no verification surface appears when there are no questions |
| WEB-VERIFY-2 | P0 | Implemented | Deep-link verification to maintenance truth | Home carries an unresolved count; affected history records show **Needs confirmation**; review opens the exact record or field |
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

## Explicitly deferred

| ID | Status | Task | Prerequisite |
|----|--------|------|--------------|
| NOTIFY-DESIGN-1 | Deferred | Research owner expectations for cadence, quiet hours, overdue nudges, and control | User-centered notification research |
| NOTIFY-DESIGN-2 | Deferred | Design notification domain contracts and delivery architecture | Accepted product behavior from NOTIFY-DESIGN-1 |
| NOTIFY-DESIGN-3 | Deferred | Decide channels: browser, push, email, or combinations | Permission, privacy, cost, and reliability assessment |
| NOTIFY-DESIGN-4 | Deferred | Define future mute/defer semantics | Separate attention state, actual due time, and next allowed nudge |
| NOTIFY-BUILD | Blocked by design | Implement notification delivery and user controls | NOTIFY-DESIGN-1 through NOTIFY-DESIGN-4 accepted |
| OWNER-HABIT-LLM | Deferred | Expand natural-language habit extraction beyond the deterministic Techron pilot | Private tuned prompt/evals that emit the public `OwnerHabitProposalV1` schema |

## Guardrails

- Do not treat in-app attention lists, banners, or action feedback as notification delivery.
- Deep-link targets may be implemented before notification delivery, but they must not imply that cadence, channel, permissions, or delivery reliability exist.
- Do not let notification preferences modify maintenance history or actual due dates.
- Do not add per-item delay controls as part of web-attention work.
- Do not expand mobile into a second full review application during the capture phase.
- Do not let voice, rules, or LLM extraction silently change an owner interval.
- Do not store a driver's-license number or date of birth in the compliance-deadline contract.
- Do not attach personal compliance deadlines to a vehicle aggregate.
