# VehicleOS

VehicleOS is an AI-native operations platform for long-lived vehicle maintenance and ownership.
This repository contains the product code and lightweight architecture artifacts.

## What this project demonstrates

- Event-sourced domain model for durable state and explainability
- Deterministic policy engine for maintenance recommendations
- AI-assisted extraction and explanation with human approval gates
- Monorepo architecture with separate web, API, and worker applications

## Repository layout

```text
apps/
  web/      Next.js user application
  api/      TypeScript API service
  worker/   Background job and extraction workers
packages/
  domain/   Domain events, models, and transition logic
  ui/       Shared UI primitives
  config/   Shared TypeScript and lint configuration
  prompts/  Versioned prompt assets and schema contracts
db/
  migrations/
  seeds/
infra/
  docker/
  terraform/
docs-lite/
  adr/
  diagrams/
```

## First vertical slice target

Receipt upload -> extraction -> `service.recorded` event -> projection update -> recommendation -> user approval.

## Quick start

1. Install Node 20+ and pnpm 9+.
2. Run `pnpm install`.
3. Run `pnpm dev` to start all dev targets.

## Deliberately not automated yet

- External scheduling and dealer APIs
- Insurance and registration automation
- Full conversational co-pilot for every workflow

See `docs-lite/adr` for key decisions and `docs/` for planning artifacts migrated from the workspace.
