# Evals — Vehicle OS

Public **methodology** for measuring AI-assisted extraction and explanation quality. Golden fixtures and tuned scoring live in the private `vehicleos-engine` repo — not here.

## What we eval (and what we don't)

| Layer | Eval approach | In this repo? |
|-------|---------------|---------------|
| Receipt / voice **extraction** | Schema conformance + field-level accuracy vs human labels | Methodology only |
| **Schedule / policy** | Unit tests + golden-path integration test | Yes — `packages/domain`, `apps/api` CI |
| **Explanation copy** | Optional LLM-judge rubric (future) | Methodology only |

The schedule engine does **not** use LLM evals. It uses deterministic tests. See essay: *Why the schedule engine never calls an LLM* (P1 #8 in project strategy).

## Golden path contract (CI)

The integration test in `apps/api/src/golden-path.integration.test.ts` is the **system eval** for v1:

```text
vehicle create → receipt confirm → service.recorded → recommendation → task.decided
```

CI job `test-golden-path` runs on every push/PR to `master`:

- `pnpm --filter @vehicleos/domain test`
- `pnpm --filter @vehicleos/api test`
- `pnpm --filter @vehicleos/worker test`

If this fails, the vertical slice is broken — not a model regression, a **product regression**.

## Extraction eval dimensions (hosted / BYOK)

Before an LLM-assisted import reaches owner early access, run it through the
isolated [Import Research Cohort](../docs/research-import-cohort.md). That
surface captures consented source variation, schema-bound drafts, owner
corrections, and versioned failures without ever writing a model output into the
owner event store.

When we score extraction quality (private goldens in `vehicleos-engine/evals/golden/`):

| Dimension | Pass criteria |
|-----------|---------------|
| **Schema valid** | Output parses against `packages/prompts/*.schema.json` |
| **Shop / date / mileage** | Exact or within tolerance vs human label |
| **Line items** | Recall ≥ threshold on service types (oil, rotate, filter…) |
| **Confidence calibration** | Low-confidence rows routed to human review — never silent promote |
| **No hallucinated services** | Zero invented line items not on source document |

For the paired CARFAX experiment in
[ADR-017](../docs-lite/adr/ADR-017-paired-carfax-pdf-extraction-evaluation.md),
score `text-first` and `direct-pdf` attempts from the same document against the
owner-corrected draft. Record which attempt the owner saw, and manually
adjudicate whole-visit disagreements against the source to control for anchoring
bias. Compare paired quality, correction burden, latency, tokens, and cost; do
not select a strategy from aggregate schema validity alone.

## Running evals locally

```bash
# System contract (public)
pnpm --filter @vehicleos/domain test
pnpm --filter @vehicleos/api test

# Extraction goldens (private engine — when available)
# cd vehicleos-engine && pytest evals/
```

## Adding a new public eval

1. Add a **methodology section** here (what, why, pass bar).
2. Add representative **non-golden** fixtures under `evals/fixtures/sample/` if needed for docs.
3. Never commit production prompt text or tuned weights to this repo — see [`docs/open-core-boundary.md`](../docs/open-core-boundary.md).

## Related

- Open-core IP: Interview Prep `workspace/strategy/ip-and-open-core.md`
- Prompt schemas: `packages/prompts/`
- Policy stub: `packages/domain/src/policy/stub-policy-engine.ts`
