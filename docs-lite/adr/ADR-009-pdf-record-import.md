# ADR-009 — PDF record import (CARFAX, RMV, and owner portals)

**Status:** Accepted (2026-07-24)  
**Supersedes:** ADR-006 — Browser extension import (withdrawn, removed 2026-07-24)  
**Deciders:** Product / architecture  
**Context:** Owners already have maintenance and registration history in vendor portals (CARFAX Car Care, Massachusetts RMV, etc.). Server-side scraping and browser extensions add trust friction and maintenance cost. Owners can print any portal page to PDF on their own device.

---

## Decision

Ship a **Record import** workspace in the hosted app where Owners upload **category-labeled PDFs** (and, during early access, validated **JSON** exports). The intelligence layer extracts structured rows; Owners **review before commit**; domain writes remain deterministic (`service.recorded` today; registration/title events when RMV ships).

### Canonical owner flow

```text
Owner logs into portal (CARFAX, RMV, …)
  → Print / Save as PDF (Ctrl+P / Share → PDF)
  → Vehicle OS · Record import · pick category
  → Upload PDF
  → Assistant extracts rows (ENG-2) + confidence scores
  → Review table (C-2) — edit / exclude rows
  → Confirm → domain events
```

### Categories (v1 → v2)

| Category | Maintenance? | v1 scope |
|----------|----------------|----------|
| **CARFAX service history** | Yes — feeds timeline + schedule baseline | JSON import now · PDF extract under development |
| **RMV / DMV records** | No — registration, title, inspection stamps | Follow-up after CARFAX dogfood · same PDF principle |
| **ChatGPT threads** (optional) | Context only | Paste / export JSON — not live sync |

**Not in scope:** browser extensions, Playwright portal automation, storing portal passwords on Vehicle OS servers.

---

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Browser extension (ADR-006) | Extra install; DOM fragility; same trust story as PDF with more code |
| Connect desktop Playwright | Credentials on desktop app; harder to audit than print-to-PDF |
| Server-side scrape | Credentials on server; trust failure |
| Manual JSON only | Valid interim; PDF is the primary UX |

---

## Architecture

```text
[Owner PDF on device]
  → POST upload (future) or paste VehicleOSImport.v1 JSON (now)
  → worker: PDF → text → LLM/stub extract (ENG-2)
  → review UI (C-2)
  → POST /api/vehicles/:id/import
  → service.recorded (carfax_import) · future: vehicle.registration.* events
```

**Schema:** [`connectors/carfax-connect/schema/vehicleos-import.v1.schema.json`](../../connectors/carfax-connect/schema/vehicleos-import.v1.schema.json)  
**CLI validate:** `connectors/carfax-connect/cli` — local audit before upload.

---

## Security

- PDFs and portal sessions stay on the Owner device until explicit upload.
- Open-source schema + CLI; extraction prompts private (open-core boundary).
- Privacy copy updated when PDF ingest ships.

---

## Consequences

- BUILD workstream **IMP-*** replaces withdrawn **CX-*** extension milestones.
- RMV connector reuses hub UI; separate extract schema when implemented.
- Interview story: “Import at the edge — Owner prints what they already trust, assistant structures it, domain commit is auditable.”

---

## Related

- [`workspace/strategy/build-personal-real-car-program.md`](../../../workspace/strategy/build-personal-real-car-program.md)
- [`connectors/carfax-connect/README.md`](../../connectors/carfax-connect/README.md)
- [ADR-011](./ADR-011-import-enrichment-assistant-review-and-shop-memory.md) — enrichment, shop memory, assistant review tiers (IMP-11)
