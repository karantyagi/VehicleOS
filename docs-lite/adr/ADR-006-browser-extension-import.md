# ADR-006 — Browser extension import (CARFAX + ChatGPT)

**Status:** Proposed (2026-07-23)  
**Deciders:** Product / architecture  
**Context:** Owner dogfood on real **2021+ Acura TLX** requires one-time history import and optional ChatGPT thread capture without server-side portal credentials.

---

## Decision

Ship a **VehicleOS browser extension** (Chrome first; Edge-compatible) that:

1. Runs **only on user-initiated action** on allowed origins (CARFAX Car Care, ChatGPT).
2. Extracts **structured JSON** locally in the browser — credentials and page DOM stay on device until export.
3. Posts to hosted **`POST /api/vehicles/:id/import/batch`** with session auth (or copies JSON for manual upload).
4. For ChatGPT threads: export **`.json` or `.md`** (VehicleOS-specific schema, simpler than generic exporters).
5. Optional **LLM assist** (hosted worker, BYOK later): map messy text → `VehicleOSImport.v1` with **confidence scores**; rows below threshold → review queue in app (never silent promote).

**Not in scope for v0 extension:** unattended scraping, storing CARFAX passwords on VehicleOS servers, OAuth to OpenAI for “live ChatGPT sync.”

---

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Server-side CARFAX automation | Credentials on server; trust failure for Owners |
| Connect desktop Playwright only | Higher friction than extension for one-time import |
| Official ChatGPT API connector | No API for consumer chat history |
| Manual JSON only | OK fallback; extension reduces errors |

---

## Architecture

```text
[CARFAX / ChatGPT tab]  →  content script (read DOM / thread)
        →  extension service worker (normalize → VehicleOSImport.v1 or ChatImport.v1)
        →  optional: worker LLM parse + confidence
        →  POST import API  →  domain events (service.recorded, owner_note, evidence)
```

**Evals:** Extension-sourced imports use same extraction eval dimensions as [`evals/README.md`](../../evals/README.md); log `import_source`, `confidence`, `model` in `llm_invocations` when LLM used (OBS-1).

---

## Security

- Minimal permissions (`activeTab`, host permissions for carfax.com, chatgpt.com, app.vehicleos.app).
- Open-source extension folder under `connectors/vehicleos-browser-extension/`.
- Privacy copy update when import ships.

---

## Consequences

- New BUILD workstream **CX-*** before Phase 4 dogfood Session D.
- Real LLM (ENG-2) can follow connectors; extension may call stub mapper first.
- Interview story: “Import at the edge — user device, auditable extension, deterministic domain write.”

---

## Related

- [`connectors/carfax-connect/schema/vehicleos-import.v1.schema.json`](../../connectors/carfax-connect/schema/vehicleos-import.v1.schema.json)
- [`build-personal-real-car-program.md`](../../../workspace/strategy/build-personal-real-car-program.md)
