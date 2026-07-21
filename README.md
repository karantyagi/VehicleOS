
# VehicleOS

[![CI](https://github.com/karantyagi/VehicleOS/actions/workflows/pr-frontend-build.yml/badge.svg?branch=master)](https://github.com/karantyagi/VehicleOS/actions/workflows/pr-frontend-build.yml)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fvehicleos.app&label=vehicleos.app)](https://vehicleos.app)
[![App](https://img.shields.io/website?url=https%3A%2F%2Fapp.vehicleos.app&label=app.vehicleos.app)](https://app.vehicleos.app)

VehicleOS is **free early access for car owners** at [app.vehicleos.app](https://app.vehicleos.app).
MIT-licensed public repo for architecture, ADRs, and evals methodology — not a self-host product.
This repository contains the product code and lightweight architecture artifacts.

## What this project demonstrates

- Event-sourced domain model for durable state and explainability
- Deterministic policy engine for maintenance recommendations
- AI-assisted extraction and explanation with human approval gates
- Monorepo architecture with separate marketing, product, API, and worker apps
- AI-native build: human-led architecture + agent-assisted implementation ([Cursor](https://cursor.com))

## License

**MIT** — see [`LICENSE`](./LICENSE). Showcase code is public for transparency, learning, and contributor review.

**Public repo:** Architecture showcase — see [`docs/open-core-boundary.md`](./docs/open-core-boundary.md). **Product:** hosted early access at `app.vehicleos.app`.


## Public URLs

| URL | App | Purpose |
|-----|-----|---------|
| [app.vehicleos.app](https://app.vehicleos.app) | `apps/web` | **Product** — free early access (sign in) |
| [vehicleos.app](https://vehicleos.app) | `apps/marketing` | Landing page |
| GitHub (this repo) | — | ADRs, domain model, evals — architecture showcase |

## Repository layout

```text
apps/
  marketing/  Public landing site - Phase A live
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
  docker/     Local dev only (not a supported self-host product)
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
evals/
  README.md
connectors/
  carfax-connect/   OSS import CLI + schema (v0)
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
| `apps/web` (+ `/api/*`) | Vercel | Owners UI + golden-path API route handlers on `app.vehicleos.app` |
| Postgres | [Supabase](https://supabase.com) | Managed Postgres via `DATABASE_URL` — see [`docs/deployment/supabase-setup.md`](./docs/deployment/supabase-setup.md) |
| `apps/api` | Local / optional | Fastify dev server; same `@vehicleos/server` as Vercel routes |
| `apps/worker` | Railway / Fly.io (later) | Background jobs when shipped — Postgres stays on Supabase |

Vercel + Supabase is the default hosted stack for BUILD freeze. Railway/Fly are only needed when you deploy long-running workers, not for Postgres itself.

## Deliberately not automated yet

- External scheduling and dealer APIs
- Insurance and registration automation
- Full conversational co-pilot for every workflow
- Marketing site Phase 2 pages (see `docs/05-marketing-site/sitemap.md`)

## Key docs

- Contributing: [`CONTRIBUTING.md`](./CONTRIBUTING.md) — branches, PRs, CI
- Vercel CD: [`docs/deployment/vercel-setup.md`](./docs/deployment/vercel-setup.md) — preview + production deploys
- Supabase Postgres: [`docs/deployment/supabase-setup.md`](./docs/deployment/supabase-setup.md) — hosted Owners DB + env vars
- ADR-004: [`docs-lite/adr/ADR-004-phase0-hosted-deployment.md`](./docs-lite/adr/ADR-004-phase0-hosted-deployment.md) — Phase 0 hosted stack decision
- ADR-005: [`docs-lite/adr/ADR-005-owners-only-positioning.md`](./docs-lite/adr/ADR-005-owners-only-positioning.md) — Owners-only GTM
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
