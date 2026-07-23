# ADR-007 — Large OEM manual uploads (direct-to-storage)

**Status:** Accepted (2026-07-23)

## Context

OEM owner manuals are often **20–80 MB** PDFs. Vercel serverless routes enforce a **~4.5 MB request body** limit, so multipart upload through `/api/.../manuals/upload` fails with “content too large” even when application code allows 10 MB.

## Decision

1. **Receipts / voice:** remain **≤10 MB** via API multipart (typical photo/PDF).
2. **OEM manuals:** **≤50 MB** via **direct-to-Supabase Storage** using a signed upload URL minted by a small JSON API route.
3. **100 MB:** deferred — Supabase single-object limits and mobile upload reliability; revisit with paid tier + progress UI if needed.

## Flow

```text
Client → POST /manuals/upload-url (metadata only)
       ← { signedUrl, token, storageKey }
Client → PUT file to Supabase (bypasses Vercel body limit)
Client → POST /manuals/confirm with storageKey
```

## Consequences

- Manual panel uses two-step upload; error messages distinguish size vs network.
- Storage bucket `receipts` also holds `manual/` keys (existing pattern).
- Production LLM parse (ENG-6) reads from `storageKey` asynchronously — unchanged.
