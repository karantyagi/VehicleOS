# VehicleOS

[![CI](https://github.com/karantyagi/VehicleOS/actions/workflows/pr-frontend-build.yml/badge.svg?branch=master)](https://github.com/karantyagi/VehicleOS/actions/workflows/pr-frontend-build.yml)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fvehicleos.app&label=vehicleos.app)](https://vehicleos.app)
[![App](https://img.shields.io/website?url=https%3A%2F%2Fapp.vehicleos.app&label=app.vehicleos.app)](https://app.vehicleos.app)

VehicleOS is an AI-native operations platform for long-lived vehicle maintenance and ownership.
MIT-licensed open core with a planned hosted product layer.
This repository contains the product code and lightweight architecture artifacts.

## What this project demonstrates

- Event-sourced domain model for durable state and explainability
- Deterministic policy engine for maintenance recommendations
- AI-assisted extraction and explanation with human approval gates
- Monorepo architecture with separate marketing, product, API, and worker apps
- AI-native build: human-led architecture + agent-assisted implementation ([Cursor](https://cursor.com))

## License

**MIT** — see [`LICENSE`](./LICENSE). Showcase code is public for credibility and learning.

**Open core boundary:** This repo is a technical whitepaper with representative code — not the full tuned commercial engine. See [`docs/open-core-boundary.md`](./docs/open-core-boundary.md).

The commercial product is the **hosted service** (managed ops, notifications, tuned intelligence) — open showcase + cloud, same pattern as PostHog, Supabase, Cal.com.

Full business model (private strategy): workspace `strategy/business-model.md` and `strategy/ip-and-open-core.md`.

## Public URLs

| URL | App | Purpose |
|-----|-----|---------|
| [vehicleos.app](https://vehicleos.app) | `apps/marketing` | Resume link — recruiter landing page (live) |
| [app.vehicleos.app](https://app.vehicleos.app) | `apps/web` | Product app — Owner shell (early access) |
| GitHub (this repo) | — | Living case study — code, ADRs, evals |

## Repository layout

```text
apps/
  marketing/  Public landing site (recruiter hook) — Phase A live
  web/        Next.js product application → app.vehicleos.app
  api/        TypeScript API service
  worker/     Background jobs and extraction workers
packages/
  domain/     Domain events, models, and transition logic
  ui/         Shared UI primitives
  config/     Shared TypeScript and lint configuration
  prompts/    Versioned prompt assets and schema contracts
db/
  migrations/
  seeds/
infra/
  docker/     Local / self-host path (open core)
  terraform/
docs/
  01-architecture/
  02-repo-design/
  03-mvp-spec/
  04-lakehouse-v2/
  05-marketing-site/   Sitemap and landing page plan
docs-lite/
  adr/
  diagrams/
tests/
  integration/
  e2e/
```

## First vertical slice target

Receipt upload → extraction → `service.recorded` event → projection update → recommendation → user approval.

## Quick start

1. Install Node 20+ and pnpm 9+.
2. Run `pnpm install`.
3. Run `pnpm dev` to start dev targets (`marketing`, `web`, `api`, `worker`).

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for branch naming, PR workflow, and CI expectations.

## Deployment (recommended)

| App | Platform | Why |
|-----|----------|-----|
| `apps/marketing` | [Vercel](https://vercel.com) | Next.js-native, fast marketing deploys, custom domain |
| `apps/web` | Vercel | Same monorepo, separate project + subdomain |
| `apps/api` + `apps/worker` | Railway / Fly.io / AWS | Long-running workers, Postgres, queues — not edge |

Vercel is the default for frontends in this stack, not the only option. API/worker need a compute + DB host; keep them off the marketing deploy path.

## Deliberately not automated yet

- External scheduling and dealer APIs
- Insurance and registration automation
- Full conversational co-pilot for every workflow
- Marketing site Phase 2 pages (see `docs/05-marketing-site/sitemap.md`)

## Key docs

- Contributing: [`CONTRIBUTING.md`](./CONTRIBUTING.md) — branches, PRs, CI
- Vercel CD: [`docs/deployment/vercel-setup.md`](./docs/deployment/vercel-setup.md) — preview + production deploys
- ADRs: `docs-lite/adr/`
- System architecture: `docs/01-architecture/system-architecture.md`
- MVP spec: `docs/03-mvp-spec/mvp-technical-spec.md`
- Marketing sitemap: `docs/05-marketing-site/sitemap.md`

<details>
<summary>Maintainer links</summary>

### Dashboards

| System | Link |
|--------|------|
| **CI** | [GitHub Actions](https://github.com/karantyagi/VehicleOS/actions) · [workflow](https://github.com/karantyagi/VehicleOS/actions/workflows/pr-frontend-build.yml) |
| **Marketing (Vercel)** | [Project dashboard](https://vercel.com/create-os/vehicle-os-marketing) |
| **Product (Vercel)** | [Project dashboard](https://vercel.com/create-os/vehicle-os-web) |
| **Live site** | [vehicleos.app](https://vehicleos.app) · [app.vehicleos.app](https://app.vehicleos.app) |

### Docs

- [CONTRIBUTING.md](./CONTRIBUTING.md) — branches, PRs, CI
- [Vercel CD setup](./docs/deployment/vercel-setup.md)
- [GitHub repo polish](./docs/maintainer/github-repo-polish.md)

</details>
