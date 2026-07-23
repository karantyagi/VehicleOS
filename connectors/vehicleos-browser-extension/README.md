# VehicleOS Browser Extension (Chrome)

**Status:** Spec / scaffold — BUILD Phase 2  
**ADR:** [`docs-lite/adr/ADR-006-browser-extension-import.md`](../../docs-lite/adr/ADR-006-browser-extension-import.md)

## Purpose

One-click export from:

| Source | Output |
|--------|--------|
| **CARFAX Car Care** (logged-in session) | `VehicleOSImport.v1` JSON → batch import API |
| **ChatGPT** conversation | `VehicleOSChatImport.v1` (JSON or MD) → owner notes + optional evidence |

Inspired by generic ChatGPT exporters — **narrow scope**: vehicle maintenance context only.

## v0 milestones

| Milestone | Deliverable |
|-----------|-------------|
| CX-0 | Manifest V3 + popup “Copy import JSON” (manual paste into app) |
| CX-1 | CARFAX content script → map service rows to import schema |
| CX-2 | ChatGPT content script → thread → MD/JSON download |
| CX-3 | `POST /api/vehicles/:id/import/batch` + in-app review table |
| CX-4 | Optional LLM normalize + confidence → review queue |
| CX-5 | Chrome Web Store **unlisted** or dev load only until dogfood done |

## Dev load (Android-adjacent: use desktop Chrome first)

```bash
cd connectors/vehicleos-browser-extension
# pnpm install (when package.json added)
# Chrome → Extensions → Load unpacked → this folder
```

## LLM / eval / cost

- **v0:** Rule-based DOM mapping only; no tokens.
- **v1:** Worker calls private engine; extension sends raw payload; response includes `confidence` per row.
- **Observability:** `llm_invocations` (OBS-1) — not in extension bundle.

## Interview prep

- Open-core: extension + schema MIT; tuned prompts private.
- Grill line: “No ChatGPT OAuth — export at edge, human review below confidence threshold.”
