# ADR-008 — Owner nav: split “More” into task-oriented sections

**Status:** Accepted (2026-07-23)

## Context

“More” bundled OEM manual, voice, quotes, and seasonal prompts — vague for Owners and hid the **onboarding intent** (give the assistant baseline context).

## Decision

Replace single **More** with:

| Nav | Purpose |
|-----|---------|
| **Add context** | Owner manual PDF + maintenance schedule confirm |
| **Notes** | Voice + structured owner notes |
| **Quotes** | Dealer quote check + seasonal prompts |

Remove **Resale export** from owner UI (API remains for build/demo).

## Consequences

- Section shortcuts extend to ⌘1–7.
- Settings holds **vehicle edit/delete** and **account delete** (ADR separate flows).
