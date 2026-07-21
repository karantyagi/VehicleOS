# Public repository — architecture showcase

**Audience:** Engineers reviewing Vehicle OS before an interview, or contributors reading ADRs.

Vehicle OS is a **hosted product for car owners** (free early access at [app.vehicleos.app](https://app.vehicleos.app)). This repository is **not** a supported self-host or “run it yourself” distribution.

---

## What this repo is for

| In repo | Purpose |
|---------|---------|
| ADRs | Architecture decisions and tradeoffs |
| `packages/domain` | Event model, policy interfaces, golden-path contracts |
| `evals/` | Public eval methodology (fixtures in private engine) |
| Sample vertical slice | Integration tests, representative API handlers |
| Connect CLI (v0) | Development/import tooling — not a marketed owner feature |

**Start here for the product:** [app.vehicleos.app](https://app.vehicleos.app) · [vehicleos.app](https://vehicleos.app)

---

## What is intentionally not in this repo

| Layer | Where it lives |
|-------|----------------|
| Tuned recommendation / quote scoring | Private `vehicleos-engine` at deploy time |
| Production prompt packs | Private engine |
| Full eval golden fixtures | Private engine |

The hosted app bundles tuned intelligence; the public repo proves **design and boundaries**, not the full commercial brain.

---

## License

MIT — see [`LICENSE`](../LICENSE). Open source for transparency and learning; **product GTM is hosted early access only** (see [ADR-005](../docs-lite/adr/ADR-005-owners-only-positioning.md)).

---

## For interview reviewers

Read: ADR-001 (Postgres), ADR-002 (event sourcing), ADR-004 (hosted stack), ADR-005 (positioning). Run CI-backed tests locally if desired — no docker self-host path is required to evaluate the architecture.
