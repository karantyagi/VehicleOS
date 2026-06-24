# VehicleOS Repo Structure And Initial Doc Plan

## Recommended Code Repo Shape

```text
VehicleOS/
  README.md
  .gitignore
  apps/
    web/
    api/
    worker/
  packages/
    domain/
    ui/
    config/
    prompts/
  db/
    migrations/
    seeds/
  infra/
    docker/
    terraform/
  scripts/
  tests/
    integration/
    e2e/
  examples/
  docs-lite/
    adr/
    diagrams/
```

## Recommended First Repo Deliverables

1. Monorepo skeleton with `apps/`, `packages/`, `db/`, and `tests/`.
2. Root README with architecture summary and a single system diagram.
3. ADR-001 choosing Postgres + pgvector.
4. ADR-002 choosing event-sourced domain model.
5. One end-to-end vertical slice: receipt upload to recommendation.
