# ADR-016 — Isolated import research cohort

**Status:** Accepted (2026-08-01)  
**Deciders:** Product / architecture  
**Related:** ADR-009 (PDF record import) · ADR-011 (import enrichment) ·
ADR-012 (catalog vs owner runtime).

## Context

Two CARFAX PDFs prove that VehicleOS can build a happy path. They do not prove
that messy, owner-exported PDFs are safe to admit into the owner product. A
production import path would combine personal vehicle history, an uncalibrated
model, incomplete observability, and no usable regression corpus.

## Decision

Create one invite-only research surface, research.vehicleos.app:

1. Reuse apps/web and shared contracts, but deploy it as a separate Vercel
   project with APP_SURFACE=research-cohort.
2. Use a distinct Supabase project, Auth tenant, private Storage bucket, and
   server credentials. Do not reuse production data or users.
3. Require both sign-in and an explicit email allowlist.
4. Require consent per document; default raw-PDF retention is 30 days; permit
   participant deletion.
5. Make every run versioned by document hash, model, prompt contract, schema,
   and correction state.
6. Permit the LLM to create only a schema-bound research draft. It has no
   product-import or event-store write capability.
7. Treat an owner correction as a potential private regression candidate only
   with an additional consent flag and human de-identification review.
8. Route allowlisted operators directly to the protected evidence console;
   participants see only their upload/review flow. Give each participant five
   successful-draft slots during the pilot, one active import at a time.
   Parsing failures release their temporary slot. A deletion-safe HMAC-derived
   quota count persists without retaining the raw email or Auth user id.

## Boundary

~~~text
Owner document -> Research draft -> Owner correction -> Private eval candidate
                                                    X-> Product event store
~~~

The X is intentional. Promotion from research into the owner app is a separate
decision after held-out eval quality, cost, latency, and safety gates are met.

## Alternatives considered

| Alternative | Rejected because |
| --- | --- |
| Same production project with a research table | Risks user/data leakage, grants too much blast radius, and makes cleanup ambiguous |
| Local dogfood JSON only | Produces no layout diversity, consent trail, or owner-label feedback loop |
| Separate codebase | Duplicates authentication, upload, schema, and review code; quality improvements would not transfer |
| Direct LLM-to-product import | An uncertain source document would become maintenance truth without a reliable owner gate |

## Consequences

The cohort adds one small operational surface but creates a durable evidence
loop: source variation, model output, owner correction, regression, and a
measurable promotion gate. It also creates a credible interview demonstration
of environment isolation, privacy boundary, LLM evaluation, and safe rollout.
