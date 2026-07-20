# Integration tests

Golden-path integration test lives in `apps/api/src/golden-path.integration.test.ts` and runs via:

```bash
pnpm --filter @vehicleos/api test
```

Coverage:

- Vehicle create → receipt ingest → `service.recorded` → recommendation → task
- Task approve/dismiss/snooze via `task.decided`
- Projection correctness for timeline + Now queue

Postgres persistence is optional for CI (in-memory `EventStore` + vehicle repo). Local Postgres:

```bash
docker compose -f infra/docker/docker-compose.yml up -d
bash scripts/db-migrate.sh
DATABASE_URL=postgresql://vehicleos:vehicleos@localhost:5432/vehicleos pnpm --filter @vehicleos/api dev
```
