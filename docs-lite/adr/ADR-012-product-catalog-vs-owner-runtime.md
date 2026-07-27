# ADR-012 — Product catalog (Plane A) vs owner runtime (Plane B)

**Status:** Accepted (2026-07-25)  
**Amended:** 2026-07-26 — creator-side manual source providers and provenance<br>
**Deciders:** Product / architecture  
**Related:** ADR-010 (service matching) · ADR-011 (import enrichment) · [`product-data-vs-owner-intelligence.md`](../../../workspace/strategy/product-data-vs-owner-intelligence.md) · [`oem-knowledge-pack-factory.md`](../../../workspace/strategy/oem-knowledge-pack-factory.md)

---

## Context

VehicleOS must not conflate **creator product data** (OEM schedules, aliases, shop packs) with **per-owner runtime intelligence** (timeline, reminders, confirmed memory). Owners should not upload OEM manuals for supported cars; schedule truth is product infrastructure copied in at vehicle create.

Strategy SoT: [`product-data-vs-owner-intelligence.md`](../../../workspace/strategy/product-data-vs-owner-intelligence.md).

---

## Decision

Two planes, one hydrate bridge:

```text
PLANE A — Product catalog          PLANE B — Owner runtime
(packages/knowledge/, shared)       (domain_events per vehicle)
        │                                    ▲
        └ hydrate at create ─────────────────┘
```

| Plane | Examples | Writes | Cross-owner? | Survives account delete? |
|-------|----------|--------|--------------|--------------------------|
| **A** | OEM Schedule Packs, source registry/provenance, alias ontology, supported-vehicle catalog, creator playbook | Creator factory | Yes | Yes |
| **B** | Timeline, Now queue, OwnerContextMemory, evidence vault | Owner + deterministic policy | No | No — purged |

**Rules:**

1. Plane A never mutates from owner chat or import without creator/version bump.
2. Plane B never trains across tenants.
3. Due dates use Plane B timeline baselines matched via Plane A aliases — deterministic only at runtime.
4. LLM allowed at ingest/enrichment edges; **never** on domain commit or schedule projection.
5. OEM sites and manual aggregators are creator-factory discovery inputs only;
   the owner runtime never depends on a provider being reachable.

---

## Owner UX pivot

| Before | After |
|--------|-------|
| Owner uploads OEM manual | Catalog picker + auto-hydrate |
| Unsupported YMM → stub schedule | Waitlist gate — no vehicle create |
| Manual / Knowledge Base in owner nav | Hidden — dev-only for dogfood |

Owner-facing intelligence: **Reminders · Import history · Verification · Memory confirms** (Plane B only).

---

## Implementation status (2026-07-25)

| Item | Status |
|------|--------|
| `packages/knowledge/` packs + catalog JSON | ✅ |
| `hydrateOemKnowledgePack` on vehicle create | ✅ |
| `assertVehicleCreateAllowed` (`auto_verified` only) | ✅ |
| Marketing `#supported` + onboarding catalog | ✅ |
| Owner manual upload removed | ✅ (dev Context panel retained) |
| Tier-1 QA — 50 packs `auto_verified` | ⬜ **1/50** |
| Runtime alias resolver (replace regex-only path) | ⬜ Partial |
| Postgres catalog seed tables | ⬜ Deferred |

---

## Storage

| Data | Location |
|------|----------|
| Packs, aliases, catalog | `packages/knowledge/` (git; runtime load) |
| Source registry + validation provenance | `packages/knowledge/sources/registries/` (git; creator evidence) |
| Creator manual PDFs (QA) | Local `workspace/knowledge/sources/` — not in product |
| Per-vehicle schedule copy | `knowledge.schedule.recorded` events |
| Owner timeline / memory | Event store + Postgres vehicle rows |

Postgres reference tables for catalog are optional; JSON catalog is valid until scale requires DB seed.

---

## Consequences

- PROC-KB is **product work**, not owner intelligence — see [`oem-knowledge-pack-factory.md`](../../../workspace/strategy/oem-knowledge-pack-factory.md).
- Manual-source providers populate Plane A candidates offline; only
  versioned, validated Schedule Packs cross the hydrate bridge.
- Early access ships with **verified packs only**; marketing catalog lists in-review rows as waitlist.
- New features must pass the five-question classifier in strategy SoT before merge.

---

## Interview line

> “OEM schedule is product catalog data — curated, versioned, shared. Owner runtime is event-sourced per account. We hydrate catalog into events at signup; everything personal comes from what the owner imported and confirmed.”
