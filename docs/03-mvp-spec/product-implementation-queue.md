# Owner product implementation queue

**Updated:** 2026-07-30
**Scope:** Owner web attention and capture-first mobile
**Architecture:** [ADR-014](../../docs-lite/adr/ADR-014-owner-attention-and-deferred-notification-control.md)

This queue records adopted product direction. It does not authorize notification-system implementation.

## Current focus

| ID | Priority | Status | Task | Acceptance boundary |
|----|----------|--------|------|---------------------|
| WEB-ATTN-1 | P0 | Implemented | Replace owner-facing **Reminders** framing with a neutral home/attention framing | **Home** answers what needs action this week without promising push delivery |
| WEB-ATTN-2 | P0 | Implemented | Remove Snooze from the owner web workflow | No new owner snooze action is offered; existing snooze events remain readable and visible as unresolved attention |
| WEB-ATTN-3 | P0 | Implemented | Define the web action lifecycle | Scheduled, Done, Fix this, and Not needed have distinct paths; Done opens maintenance record creation |
| WEB-ATTN-4 | P0 | Implemented | Present attention by owner time horizon | This week leads; next week and this month support planning; overdue work remains in This week |
| WEB-ATTN-5 | P1 | Implemented | Keep maintenance truth available behind the attention summary | Full history, actual due dates, evidence, and long-range schedule remain under Maintenance |
| WEB-ATTN-6 | P0 | Implemented | Retire automatic browser-notification behavior from the current owner slice | The notification-permission hook and automatic browser delivery were removed |
| WEB-IA-1 | P1 | Implemented | Simplify persistent owner navigation | Owner navigation is **Home**, **Maintenance**, and **Add records**; rare verification appears contextually on Home |
| MOBILE-CAP-0 | P1 | Implemented | Choose the smallest capture delivery shell | The existing responsive PWA is the capture shell; no native app dependency was introduced |
| MOBILE-CAP-1 | P1 | Implemented | Specify the capture-only mobile flow | Vehicle target, photo/PDF, minimal voice note, upload progress, retry, and success are covered |
| MOBILE-CAP-2 | P1 | Implemented | Link uncertain captures to web review | Queued or conflicting captures expose an explicit **Review on Home** handoff instead of expanding mobile review |

## Explicitly deferred

| ID | Status | Task | Prerequisite |
|----|--------|------|--------------|
| NOTIFY-DESIGN-1 | Deferred | Research owner expectations for cadence, quiet hours, overdue nudges, and control | User-centered notification research |
| NOTIFY-DESIGN-2 | Deferred | Design notification domain contracts and delivery architecture | Accepted product behavior from NOTIFY-DESIGN-1 |
| NOTIFY-DESIGN-3 | Deferred | Decide channels: browser, push, email, or combinations | Permission, privacy, cost, and reliability assessment |
| NOTIFY-DESIGN-4 | Deferred | Define mute/remind-later semantics | Separate attention state, actual due time, and next allowed nudge |
| NOTIFY-BUILD | Blocked by design | Implement notification delivery and user controls | NOTIFY-DESIGN-1 through NOTIFY-DESIGN-4 accepted |

## Guardrails

- Do not treat in-app attention lists, banners, or action feedback as notification delivery.
- Do not let notification preferences modify maintenance history or actual due dates.
- Do not add a new snooze workflow as part of web-attention work.
- Do not expand mobile into a second full review application during the capture phase.
