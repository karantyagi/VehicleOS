# Vehicle OS Connect (v0)

Open-source import tooling for Owners who export maintenance history from portal sources (e.g. CARFAX Car Care) on **their own device**. Credentials never leave the machine running Connect.

## v0 scope (this folder)

| Piece | Status |
|-------|--------|
| Import file schema | `schema/vehicleos-import.v1.schema.json` |
| CLI validate + preview | `cli/` — `vehicleos-connect validate` |
| Browser automation | **Not in v0** — desktop shell is P2 |
| Hosted ingest API upload | **Not in v0** — validate locally first |

## Quick start

```bash
cd connectors/carfax-connect/cli
pnpm install
pnpm exec vehicleos-connect validate ../examples/sample-import.v1.json
pnpm exec vehicleos-connect preview ../examples/sample-import.v1.json
```

## Import format

`VehicleOSImport.v1` — JSON export consumed by hosted ingest or self-host pipeline (future). One vehicle profile + array of service records aligned with domain event payloads (`service.recorded`).

See `examples/sample-import.v1.json`.

## Security model

- Connect runs **locally** — no CARFAX passwords sent to Vehicle OS servers
- Open source so Owners can audit before handing credentials to a desktop app
- Trust center: vehicleos.app `/privacy` (when published)

## Roadmap

| Version | Deliverable |
|---------|-------------|
| **v0** | Schema + CLI validate/preview (this PR) |
| **v1** | Playwright export → JSON file |
| **v2** | Electron shell + scheduled sync |
| **v3** | Optional POST to ingest API with user consent |

## Related

- Open-core boundary: `docs/open-core-boundary.md`
- Golden path API: `apps/api/src/routes/golden-path.ts`
