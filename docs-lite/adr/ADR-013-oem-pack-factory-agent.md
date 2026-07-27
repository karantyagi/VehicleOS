# ADR-013 — OEM Pack Factory Agent (LangGraph creator pipeline)

**Status:** Proposed (outline — implement post build-freeze + ENCODE round 1)  
**Date:** 2026-07-27  
**Deciders:** Product / architecture  
**Program doc:** [`oem-pack-factory-agent-program.md`](../../../workspace/strategy/oem-pack-factory-agent-program.md)  
**Task queue:** [`task-queue.md`](../../../workspace/strategy/task-queue.md) § **O — FACTORY-AGENT**  
**Related:** ADR-010 (deterministic runtime) · ADR-012 (catalog vs runtime) · [`oem-knowledge-pack-factory.md`](../../../workspace/strategy/oem-knowledge-pack-factory.md) PROC-KB Q7/Q10

---

## Context

PROC-KB established that OEM schedule truth is **creator-curated** — owners pick supported YMM; never upload manuals. TLX and the interview verified fleet (5 models) were built with manual PDF extraction + dogfood fixtures. Scaling beyond ~10 verified packs cannot rely on the human running Cursor sessions per car.

We need a **repeatable factory agent** that:

1. Triggers on waitlist / vehicle request (and optionally ops email)
2. Discovers OEM PDF, extracts structured schedule rows with `sourcePage`
3. Runs **deterministic** QA (schema, matching fixtures, golden envelope)
4. Scores confidence; escalates low-confidence to human review
5. Opens GitHub PR; promotes to `auto_verified` only on pass
6. Notifies owner when catalog row is ready (GTM-REQ-1)

This ADR locks **where the agent runs**, **what it may write**, and **what remains human-only**.

---

## Decision summary

| Topic | Decision |
|-------|----------|
| **Agent scope** | Plane A catalog factory only — never owner runtime / event store |
| **Orchestration** | LangGraph state machine with checkpoints per `requestId` |
| **Extract** | LLM in private `vehicleos-engine` → structured JSON |
| **Verify** | Public `packages/knowledge` validators + Vitest fixtures (deterministic) |
| **Promote** | `auto_verified` only when confidence + eval gates pass |
| **Human gate** | Creator reviews low-confidence; may re-trigger extract or force-approve with logged reason |
| **Owner UX** | Waitlist until verified; no preview scaffolds in onboarding dropdown |
| **Scaffold archive** | Culled tier-2000 JSON off prod path; negative regression fixtures only |
| **Runtime schedule** | Unchanged — hydrate deterministic pack; rules own truth ([ADR-010](./ADR-010-deterministic-service-matching-and-oem-knowledge-packs.md)) |

**One sentence:** LangGraph coordinates offline OEM pack production; LLM proposes rows; deterministic validators and golden evals gate promotion; humans handle exceptions only.

---

## Architecture (accepted outline)

See program doc for full mermaid. Minimum graph:

```text
intake → manual_discovery → pdf_fetch → extract → normalize
  → schema_validate → alias_suggest → fixture_generate → eval_run
  → confidence_score → [human_review | github_pr → catalog_promote → notify_owner]
```

### Triggers

| Trigger | Source | v1 |
|---------|--------|-----|
| Web waitlist | `POST /api/catalog/vehicle-requests` → `vehicle_requests` row | ✅ wire in FACTORY-12 |
| Manual CLI | `pnpm factory:run --ymm ...` | ✅ FACTORY-7 |
| Ops email auto | Gmail label → parser → same queue | Optional FACTORY-14 |

### Artifacts produced per run

| Artifact | Path |
|----------|------|
| Dogfood extract | `seeds/dogfood/oem-extracts/{slug}/oem-schedule.v1.json` |
| Runtime pack | `packages/knowledge/packs/{packId}.v1.json` |
| Matching fixture | `packages/knowledge/fixtures/matching/{packId}.json` |
| Alias delta | PR diff on `packages/knowledge/aliases/` |
| Catalog row | `packages/knowledge/catalog/supported-vehicles.v1.json` |
| Source manifest entry | `packages/knowledge/sources/manifest.json` |
| PDF (local QA) | `workspace/knowledge/sources/{packId}/` gitignored |

---

## Confidence gates (draft — tune in FACTORY-6)

| Gate | Threshold |
|------|-----------|
| Row `confidence` | ≥ 0.85 (else flag) |
| Row `sourcePage` | Required for replace rows |
| Pack replaceable row count | ≥ 10 |
| Matching fixture | 100% pass |
| Golden envelope diff | Within `allowedIntervalDeltaMiles` |
| Pack confidence | ≥ 0.92 (or human override) |

---

## Observability

- One trace per `requestId` (LangSmith or JSONL)
- Creator queue: sort by ascending `pack_confidence`
- Never silent promote — audit log on override

---

## Supersedes / clarifies

| Prior doc | Clarification |
|-----------|---------------|
| § K AI-1 “zero-touch extract at onboarding” | **Async factory** replaces runtime LLM extract; owner waits for verified catalog |
| PROC-KB Q10 “AI-first QA” | Factory agent **is** the AI-first QA pipeline; human on flagged rows only |
| tier-2000 scaffold catalog | Archived; factory must not reproduce scaffold-quality output |

---

## Consequences

### Positive

- Repeatable TLX-quality catalog expansion without manual Cursor per car
- Strong applied-AI interview narrative (agent + evals + HITL)
- Aligns with “rules own truth, LLM at edges”

### Negative / risks

- LangGraph + engine infra is new surface area
- Gmail auto-parse is brittle — optional, not v1 blocker
- Proxy manuals (e.g. Elantra 2020 for 2024) need explicit `qaNotes` — agent must copy pattern

### Mitigations

- Golden envelope on 5 known cars before any auto_promote
- PR requires human merge to main (no auto-merge)
- `scheduleDepth: verified` badge only after factory promote

---

## Implementation checklist

Full subtasks: [`task-queue.md`](../../../workspace/strategy/task-queue.md) § **O**.

| ID | Task |
|----|------|
| FACTORY-0 | Accept this ADR after ENCODE review |
| FACTORY-1–14 | See task queue § O |

---

## Open questions (resolve during FACTORY-0)

1. Pack confidence formula — weighted mean vs min-row?
2. Auto-PR branch naming convention?
3. LangSmith project vs self-hosted JSONL only for interview?
4. Merge factory with ENG-8 manual discovery or wrap it?

---

## Status transitions

```text
Proposed (now) → Accepted (post ENCODE + FACTORY-0 review)
              → Amended (when confidence thresholds tuned from first 3 runs)
```
