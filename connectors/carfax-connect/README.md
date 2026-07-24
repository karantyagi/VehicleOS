# Vehicle OS — CARFAX import schema & CLI

Open-source **import file format** and local validator for Owners who export maintenance history from **CARFAX Car Care** using **print-to-PDF** (or JSON during early access).

**Product path (ADR-009):** Owner logs into CARFAX → Print/Save service history PDF → upload in app → assistant extracts → review → import.  
**Not supported:** browser extensions, Playwright scraping, or server-side portal automation.

## This folder

| Piece | Status |
|-------|--------|
| Import file schema | `schema/vehicleos-import.v1.schema.json` |
| CLI validate + preview | `cli/` — `vehicleos-connect validate` |
| Example TLX history | `examples/tlx-carfax-history.v1.json` (from owner PDF) |
| PDF extraction in app | **Under development** (ENG-2) — use JSON interim |

## Quick start

```bash
cd connectors/carfax-connect/cli
pnpm install
pnpm exec vehicleos-connect validate ../examples/tlx-carfax-history.v1.json
pnpm exec vehicleos-connect preview ../examples/tlx-carfax-history.v1.json
```

## Import format

`VehicleOSImport.v1` — JSON consumed by `POST /api/vehicles/:vehicleId/import`. One vehicle profile + array of service records aligned with domain event payloads (`service.recorded`, source `carfax_import`).

See `examples/sample-import.v1.json` and `examples/tlx-carfax-history.v1.json`.

## Hosted upload

1. Open **Record import** in the app sidebar.
2. Choose **CARFAX service history**.
3. Paste or upload validated JSON → review table → **Confirm import**.

PDF upload uses the same funnel once extraction ships.

## Security model

- Portal credentials stay on the Owner device until they choose to upload a PDF.
- Open-source schema + CLI so Owners can audit files before import.
- Trust center: vehicleos.app `/privacy` (when published)

## Roadmap

| Version | Deliverable |
|---------|-------------|
| **v0** | Schema + CLI validate/preview ✅ |
| **v1** | App Record import hub + JSON upload + review UI ✅ |
| **v2** | PDF upload → worker extract (ENG-2) + confidence review |
| **v3** | RMV/DMV category (non-maintenance vehicle events) |

## Related

- [`docs-lite/adr/ADR-009-pdf-record-import.md`](../../docs-lite/adr/ADR-009-pdf-record-import.md)
- Open-core boundary: `docs/open-core-boundary.md`
