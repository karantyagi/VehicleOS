# VehicleOS Import Research Cohort

## Purpose

VehicleOS needs real CARFAX layout variation before LLM-assisted PDF import is
opened to owner early access. The cohort is a small, invite-only research
surface at research.vehicleos.app. It is not a second product and it never
writes to the owner event store.

## V1 decision

| Concern | Decision |
| --- | --- |
| App code | Same apps/web codebase, enabled only by APP_SURFACE=research-cohort |
| Hosting | Separate Vercel project and domain from the owner app |
| Data plane | Separate Supabase project, database, Auth tenant, and private storage bucket |
| Access | Supabase sign-in plus exact email allowlist in RESEARCH_COHORT_ALLOWLIST |
| Model | OpenAI Responses API, gpt-5-mini by default, server-side key only |
| Model data | Extracted PDF text only, bounded to 60,000 characters, store=false |
| Product writes | None. A research draft can only be reviewed or deleted |
| Raw-PDF retention | 30 days by default, configurable from 1 to 90 days |
| Long-term learning | Participation requires consent to retain a de-identified private regression fixture. It is an explicit offline operator step, not an automatic export. |

The public repository holds the schema contract and representative request
boundary. A production-tuned instruction may be supplied through the
server-only RESEARCH_IMPORT_PRIVATE_INSTRUCTIONS setting; it belongs in the
private engine, never in this repository.

The 30-day VehicleOS deletion window applies to the private PDF and research
run. It does not override an API provider's own retention controls. OpenAI API
content is not used for training by default, but standard abuse-monitoring logs
may retain content for up to 30 days; the participant consent calls out that
extracted text, not the raw PDF, is sent to the API.

## Participant flow

~~~text
Invited owner signs in
  -> explicit consent
  -> private CARFAX PDF upload
  -> text extraction
  -> schema-bound LLM draft
  -> owner correction
  -> research run + consent + model/prompt/schema version
  -> private regression candidate, only when separately consented

No arrow reaches the VehicleOS owner event store.
~~~

The portal also captures valuable failure states: no selectable PDF text, model
not configured, invalid structured response, and model request failure. Each
state is a research outcome, not a silent fallback. The portal provides a
visible sign-out control and a research-account deletion flow that removes the
participant's stored PDFs and research runs before deleting their Supabase Auth
user. A de-identified fixture already manually separated from an account cannot
be linked back to that participant or removed later.

## Supabase setup

Create a fresh project for the cohort. Do not use production tables, storage,
Auth users, service-role key, or connection string.

1. Run the normal VehicleOS migrations required to create the base app.
2. Run ops/research-cohort/001_research_import_cohort.sql.
3. Configure Google sign-in and the callback URL for research.vehicleos.app.
4. Keep the research-imports bucket private.
5. Set the database and Supabase environment values only in the research
   Vercel project.

The migration creates research_import_runs with the participant id, consent
version, document hash, bounded retention deadline, model/prompt/schema
versions, and proposed/owner-corrected JSON. It has no product event-store
foreign key.

## Vercel setup

Create a third Vercel project pointing to the same VehicleOS repository and
apps/web root directory. Add research.vehicleos.app to that project only.

Required environment values:

~~~text
APP_SURFACE=research-cohort
NEXT_PUBLIC_APP_URL=https://research.vehicleos.app
NEXT_PUBLIC_SUPABASE_URL=<research-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<research-project-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<research-project-service-role-key>
DATABASE_URL=<research-project-pooler-url>
RESEARCH_COHORT_ALLOWLIST=friend1@example.com,friend2@example.com
OPENAI_API_KEY=<research-project-only-openai-key>
RESEARCH_OPENAI_MODEL=gpt-5-mini
RESEARCH_RETENTION_DAYS=30
CRON_SECRET=<at-least-16-character-random-string>
~~~

Never expose OPENAI_API_KEY as a NEXT_PUBLIC value or put it in Git. If the
key is absent, the portal records model-not-configured rather than pretending a
draft was created. The daily cleanup route compares CRON_SECRET to the bearer
token sent by Vercel, then removes expired PDFs and run metadata in batches.

For local visual and route testing:

~~~text
APP_SURFACE=research-cohort
AUTH_DISABLED=true
~~~

## Cohort operating loop

Start with 8 to 12 informed owners, each with one CARFAX service-history PDF.
The valuable variation is different print dates, vehicle ages, shops, service
counts, and document layouts—not a large pile of near-identical files.

For every failure:

1. Preserve the research-run version and error class.
2. Compare the source, model draft, and owner correction.
3. Categorize it: PDF/OCR, extraction, schema, mapping, or review UX.
4. Add a consented, de-identified private golden only after human review.
5. Make the parser or prompt change.
6. Re-run the regression before promoting the change.

## Launch gate to owner early access

Do not route a friend from the cohort into product import just because a few
files worked. Promote the feature only when a held-out corpus demonstrates:

| Signal | Why it matters |
| --- | --- |
| 100% schema-valid model outputs | A malformed proposal is not reviewable |
| Field accuracy and service-line recall on human labels | The draft must be useful, not merely well-formed |
| Zero hallucinated service lines in the held-out set | False history breaks owner trust |
| Confidence calibration | Low-confidence rows must be obvious in review |
| Median/p95 latency and per-document cost | The interaction must be viable for owners |
| No direct event-store writes in tests | The approval boundary remains intact |

Report actual cohort counts and results in an interview demo only after they
exist. Do not invent an accuracy number.

## Interview story

The senior-engineering signal is not that an LLM can read a PDF. It is that
VehicleOS treats the model as an uncertain proposal generator:

> We isolated a consented research cohort from production, versioned every
> extraction, made owner correction the label source, and kept schedule and
> event-store writes deterministic. That let us turn unknown document quality
> into measurable regressions before early access.

Related: ADR-009, ADR-011, ADR-016, and evals/README.md.
