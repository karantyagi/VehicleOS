# Open Core Boundary

**Audience:** Builders, contributors, and engineers verifying Vehicle OS on GitHub.

Vehicle OS follows an **open showcase + hosted product** model — similar to PostHog, Cal.com, and Supabase. This page states what the public repository intentionally includes and excludes.

---

## What this repository is

A **technical whitepaper with representative code**:

- Architecture, ADRs, and system design
- Domain **interfaces** and event types
- Prompt **schemas** (contracts — not tuned production prompts)
- A sample vertical slice and happy-path integration tests
- **Vehicle OS Connect** — open-source importer (credentials stay on your device)
- Self-host skeleton (`docker compose`)

Use it to **verify how the system is designed** — not to obtain the full tuned commercial intelligence layer.

---

## What is public (MIT)

| Included | Location (typical) |
|----------|-------------------|
| Architecture & ADRs | `docs-lite/adr/`, `docs/01-architecture/` |
| Event types & domain interfaces | `packages/domain/` |
| Policy engine **design** (rules-first; LLMs at edges) | ADRs, README |
| Prompt JSON schemas | `packages/prompts/*.schema.json` |
| Eval **methodology** (how we measure) | `evals/README.md` (when added) |
| Vehicle OS Connect (CLI + desktop) | `connectors/carfax-connect/` |
| Import file format | `connectors/carfax-connect/schema/` |
| Integration test (golden path, happy path) | `tests/integration/` |

---

## What is not in this repository

| Excluded | Why |
|----------|-----|
| Tuned production prompt text | Commercial intelligence layer |
| Recommendation scoring weights & heuristics | Tuned over months of domain work |
| Eval golden datasets (inputs + expected outputs) | Prevents shortcutting quality bar |
| Knowledge-graph derivation / inference rules | Implementation detail of hosted product |
| Hosted ingest optimizations & sync edge cases | Managed service advantage |
| Billing, production secrets, OAuth credentials | Operations |
| User vehicle data | Privacy |

The tuned engine is bundled with the **hosted product** at deploy time — not published here.

---

## User data privacy (Owners)

**Vehicle OS Connect** runs on the user's machine. CARFAX credentials are used only during import and are **not sent to Vehicle OS servers**.

Owners can audit Connect source because it is open source. Trust details: `/privacy` and `/security` on [vehicleos.app](https://vehicleos.app) (when published).

---

## Self-host vs hosted

| | Self-host (Builders) | Hosted (Owners) |
|---|---------------------|-----------------|
| **Get** | Loop skeleton + contracts + Connect | Full product experience |
| **Run** | Your infrastructure | `app.vehicleos.app` |
| **Tuned intelligence** | Basic / limited | Full recommendation & quote engine |
| **License** | MIT (this repo) | Service terms (when live) |

---

## Builders path

1. Clone this repository
2. `pnpm install && docker compose up` (when self-host path is documented)
3. Read ADRs before diving into code
4. Extend via public interfaces — contribute PRs against contracts

For interview or audit questions about trade-offs, start with `docs-lite/adr/`.

---

## License

Core showcase code: **MIT** — see [`LICENSE`](../LICENSE).

Private engine packages are proprietary and not licensed through this repository.

---

## Questions

- **Product / Owners:** [vehicleos.app](https://vehicleos.app)
- **Issues / contributions:** GitHub Issues on this repo
- **Security:** security contact on trust pages (when published)
