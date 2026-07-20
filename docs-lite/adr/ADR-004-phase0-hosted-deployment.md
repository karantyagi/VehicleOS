# ADR-004: Phase 0 hosted deployment — Vercel + Supabase

> **Decision summary:** Host the Owners path on **Vercel Hobby** (UI + `/api/`*) and a **dedicated Supabase Free project** (Postgres + Google/GitHub Auth), defer **Railway/Fly workers** until async jobs ship — bounded by **10–30 users**, **≤ $25/mo**, and **DB ≠ compute**.

- **Status:** Accepted
- **Date:** 2026-07-20
- **Phase:** Phase 0 (apply wave · BUILD freeze)
- **Supersedes:** Informal README guidance implying Railway/Fly for API + Postgres together

## Context

VehicleOS needs a **hosted Owners SaaS** on `app.vehicleos.app` for build-freeze and the Oct 2026 apply wave — not localhost-only demos. [ADR-001](./ADR-001-postgres-pgvector.md) selects Postgres as the data platform; [ADR-002](./ADR-002-event-sourced-domain-model.md) selects event sourcing for domain state. Neither ADR specifies **where** Postgres or API compute run in production.

Phase 0 introduces explicit **operating constraints**:


| #   | Constraint                                        | Rationale                                                  |
| --- | ------------------------------------------------- | ---------------------------------------------------------- |
| C1  | **10–30 total users**, **20–30 DAU**              | Early access + interview demos, not GTM scale              |
| C2  | **≤ $25/mo** infra spend                          | Founder-funded Phase 0 per business model                  |
| C3  | **Google + GitHub OAuth** for sign-in             | Table-stakes trust for first external users                |
| C4  | **Database and compute on separate vendors**      | Avoid single-vendor coupling; clearer enterprise evolution |
| C5  | **No Supabase Pro** on existing personal accounts | Two-project free-tier limit already consumed elsewhere     |


Expected load at this scale: ~5k–15k API calls/month, ~5–50 MB Postgres, far below free-tier limits on major platforms.

## Decision

Deploy Phase 0 hosted infrastructure as follows:

```text
┌─ Vercel Hobby ($0) ─────────────────────────────────────────────┐
│  apps/marketing  →  vehicleos.app                               │
│  apps/web        →  app.vehicleos.app                           │
│    ├── Next.js UI                                               │
│    ├── /api/*      →  @vehicleos/server (golden path + API)     │
│    └── Auth client →  Supabase Auth (Google + GitHub)           │
└───────────────────────────────┬─────────────────────────────────┘
                                │ DATABASE_URL (transaction pooler)
                                ▼
┌─ Supabase Free — dedicated account ($0) ────────────────────────┐
│  Project: VehicleOS                                             │
│    ├── Postgres   →  events, vehicles, projections              │
│    ├── Auth       →  OAuth providers                            │
│    └── Storage    →  receipt blobs (when evidence vault ships)  │
│  (2nd free project slot reserved for staging / experiments)     │
└─────────────────────────────────────────────────────────────────┘

Not production hosts in Phase 0:
  apps/api (Fastify)  →  local dev + integration tests only
  apps/worker         →  not deployed until async jobs exist
```

**Compute:** Vercel serverless Route Handlers colocated with `apps/web` — not a separate Railway/Fly API service.

**Data + auth:** One Supabase Free project on a **dedicated Supabase account** (separate email), using the transaction pooler connection string for serverless.

**Cost target:** ~$0–7/mo (domain amortization + optional LLM); hard cap $25/mo.

Operational runbook: `[docs/deployment/supabase-setup.md](../../docs/deployment/supabase-setup.md)` · `[docs/deployment/vercel-setup.md](../../docs/deployment/vercel-setup.md)`.

## Consequences



### Positive

- **$0 platform fees** at apply-wave scale; budget headroom for domain and light LLM use
- **Separate vendors** for compute (Vercel) and data/auth (Supabase) — matches C4
- **Single deploy surface** for UI + synchronous API — fast BUILD freeze, PR previews on Vercel
- **OAuth included** via Supabase Auth without a second auth vendor (Clerk)
- `@vehicleos/server` keeps handlers portable — API can move off Vercel without domain rewrites
- **Dedicated Supabase account** avoids Pro upgrade and isolates VehicleOS from other projects



### Negative

- **Serverless limits** on Vercel — function duration, cold starts, no long-running jobs on-platform
- **Postgres connection pooling required** — serverless instances must use Supabase pooler, not direct `5432`
- **Supabase Free pause policy** — projects pause after ~7 days of DB inactivity; mitigated by DAU, fragile if idle
- **Auth coupled to Supabase** for Phase 0 — migrating to Clerk/custom auth later is possible but costs migration work
- **P-4 “worker deployed” is partial** until Railway/Fly hosts `apps/worker`
- **Two Vercel projects + one Supabase project** — three cloud consoles to manage (acceptable at this scale)



## Alternatives considered


| Alternative                                             | Verdict                                | Why rejected or deferred                                                                                                                  |
| ------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Railway/Fly for API + worker + Postgres**             | Deferred (worker); Rejected (API + DB) | Adds ~$5–20/mo and a second deploy pipeline before async jobs exist; bundles DB with compute (violates C4 preference)                     |
| **Neon Free + Auth.js + Vercel**                        | Viable                                 | Clean separation; rejected because dedicated Supabase account delivers Postgres + Auth + Storage in one free project with less BUILD work |
| **Supabase Pro ($25/mo) — 3rd project on existing org** | Rejected                               | Consumes entire monthly budget on platform fee alone (violates C2)                                                                        |
| **Clerk Hobby + Neon + Vercel**                         | Viable                                 | Polished auth UI; rejected to avoid second vendor when Supabase Auth satisfies C3 at $0                                                   |
| **Vercel Pro ($20/mo)**                                 | Rejected                               | Unnecessary at 30 DAU; Hobby limits sufficient for ~5k–15k invocations/mo                                                                 |
| **Fastify (**`apps/api`**) as production API host**     | Rejected for Phase 0                   | Requires always-on compute (Railway/Fly); Next `/api/`* achieves same handlers with zero extra host                                       |
| **All-in Supabase Edge Functions for API**              | Rejected                               | Split stack with Next/Vercel; team expertise and monorepo layout favor Next Route Handlers                                                |




## Non-goals (Phase 0)

- Multi-region or active-active failover
- Always-on worker fleet, job queues, or cron at scale
- Enterprise SSO (SAML), SOC2, HIPAA
- Dedicated API gateway or service mesh
- Production SLA beyond vendor free-tier defaults
- Billing, usage metering, or plan enforcement



## Revisit triggers

Re-evaluate or supersede this ADR when:


| Trigger                                                                    | Likely change                                                             |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **First async job** (OCR queue, Connect sync, scheduled projections)       | Deploy `apps/worker` on Railway or Fly; Postgres stays Supabase           |
| **API latency / timeout failures** on receipt extraction or heavy routes   | Move API from Vercel Route Handlers to always-on Fastify on Railway/Fly   |
| **> ~500 DAU** or sustained **> ~100k** function invocations/mo            | Vercel Pro and/or dedicated API service; load test pooler limits          |
| **Supabase project pause** despite real users                              | Supabase Pro **or** Neon migration **or** keep-warm automation            |
| **Auth requirements** exceed Supabase (custom SAML, advanced MFA policies) | Clerk or Auth.js migration with session store in Postgres                 |
| **Enterprise tenant isolation**                                            | RDS/Aurora or dedicated Supabase org per tenant — out of apply-wave scope |




## Relationship to other ADRs


| ADR                                                | Relationship                                                                                          |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [ADR-001](./ADR-001-postgres-pgvector.md)          | **Implements** Postgres choice; Supabase is the Phase 0 managed host, not a different database engine |
| [ADR-002](./ADR-002-event-sourced-domain-model.md) | **Unchanged** — event store runs on Postgres regardless of host vendor                                |
| ADR-003 (lakehouse evolution)                      | **Orthogonal** — v2 analytics path; Phase 0 remains OLTP Postgres                                     |


System architecture doc aligns: *“API: TypeScript service or Next.js server layer”* — Phase 0 selects the **Next.js server layer** path.

## Follow-up

- [ ] Create Supabase VehicleOS project on dedicated account; run migrations
- [ ] Configure Supabase Auth (Google, GitHub) and Vercel env vars
- [x] Implement P-2 auth on hosted app (OAuth + protected routes + user-scoped API)
- [ ] Vehicle onboarding wizard polish (multi-step UI beyond “Add your vehicle”)
- [ ] Smoke test golden path on `app.vehicleos.app` with real `DATABASE_URL`
- [ ] Add RLS policies when multi-user tenancy lands
- [ ] Document worker deploy ADR amendment when `apps/worker` ships to Railway/Fly



## Interview talking point

> “Phase 0 is constraint-driven: 30 users and a $25 cap. I put Next and synchronous API on Vercel, Postgres and OAuth on a dedicated Supabase free project — separate vendors, portable handlers via a shared server package. I deferred Railway until we have async work because always-on compute is a cost and ops trade you only take when serverless timeouts or background jobs force it.”

