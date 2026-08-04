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
| Model | OpenAI Responses API, pinned gpt-5-mini-2025-08-07 by default, server-side key only |
| Model data | Paired text-first and request-scoped direct-PDF calls, both with store=false |
| Product writes | None. A research draft can only be reviewed or deleted |
| Raw-PDF retention | 30 days by default, configurable from 1 to 90 days |
| Long-term learning | Anonymous comparison counts and ratios remain after temporary source data is deleted |
| Pilot quota | Five successful drafts per participant, one active import at a time; parser failures release the slot |

The public repository holds the schema contract and representative request
boundary. A production-tuned instruction may be supplied through the
server-only RESEARCH_IMPORT_PRIVATE_INSTRUCTIONS setting; it belongs in the
private engine, never in this repository.

The 30-day VehicleOS deletion window applies to the private PDF, attempts,
drafts, and owner correction. It does not override an API provider's own
retention controls. OpenAI API content is not used for training by default,
but standard abuse-monitoring logs may retain content for up to 30 days. The
versioned consent states that both extracted text and the complete PDF are sent
to the API for the paired comparison.

## Participant flow

~~~text
Invited owner signs in
  -> explicit consent
  -> signed direct upload to private Supabase Storage
  -> paired text-first + direct-PDF schema-bound attempts
  -> one pre-assigned valid draft shown to owner
  -> owner explicitly checks every visit
  -> anonymous comparison measurement + operator adjudication

No arrow reaches the VehicleOS owner event store.
~~~

### Review-label protocol

The cohort is not evaluated merely because an owner clicks Save. A completed
review requires one explicit outcome for every visit: **Looks right**, a compact
**Fix it** correction, or **Not a service visit**. Owners can save incomplete
progress and return later, but only a completed review refreshes paired quality
metrics.

The interface does not ask a participant to grade every individual service
line. A visit confirmation deterministically confirms its itemized lines, or
marks a source-limited visit as not itemized. A compact correction reconciles
the edited list into retained, corrected, added, and removed action labels for
the operator metrics. This preserves the evaluation signal without turning the
cohort into a multi-choice survey.

The review queue keeps every visit visible. It may prioritize amber rows whose
evidence is incomplete, generic, missing a core field, or low confidence, but
those flags never silently accept the remaining rows. Green means an owner has
reviewed the row, not that a model assigned it a high confidence.

Source notes are derived from validated record fields, not from a growing list
of service-description phrases. They cover: work not itemized, a missing date,
mileage, or shop, unclear source evidence, and low extraction confidence. Each
one names the limitation and gives a single next step. For example, when a
validated record says work is not itemized, the portal asks the participant to
compare the date, mileage, and shop with their PDF and makes clear that they
must not guess or add a missing service item. If those visit details match,
**Looks right** is the correct response; the system records the missing service
detail as a source limitation automatically.

While reviewing, an invited owner can open only their own original PDF through
a five-minute, participant-scoped URL. They never see both hidden extraction
attempts, so this source check does not reveal or bias the paired assignment.

`not itemized` and `unsure` are source-availability outcomes, not automatic
model failures. Their service lines are excluded from precision/recall and
force source adjudication. An owner-rejected action remains a model-quality
signal; an owner-added action remains an omission signal.

The portal also captures valuable failure states: no selectable PDF text, model
not configured, invalid structured response, and model request failure. Each
state is a research outcome, not a silent fallback. The portal provides a
visible sign-out control and a research-account deletion flow that removes the
participant's stored PDFs, drafts, attempts, corrections, and Auth user.
Anonymous measurements may remain, but include no account id, PDF, VIN,
filename, provider, draft, extracted text, or evidence excerpt. A separate
HMAC-derived quota count may remain so deleting and re-signing-in cannot reset
the five-draft pilot limit; it retains no raw email or Auth user id.

## Supabase setup

Create a fresh project for the cohort. Do not use production tables, storage,
Auth users, service-role key, or connection string.

1. Run the normal VehicleOS migrations required to create the base app.
2. Run ops/research-cohort/001_research_import_cohort.sql.
3. Run ops/research-cohort/002_paired_extraction_evaluation.sql.
4. Run ops/research-cohort/003_participant_quota.sql.
5. Run ops/research-cohort/004_evaluation_telemetry.sql.
6. Configure Google sign-in and the callback URL for research.vehicleos.app.
7. Keep the research-imports bucket private.
8. Set the database and Supabase environment values only in the research
   Vercel project.

The migrations create the temporary research run, its two extraction attempts,
anonymous comparison observations, and operator access audit. They have no
product event-store foreign key. Participant browser policies cannot read the
hidden attempt table.

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
RESEARCH_OPERATOR_ALLOWLIST=you@example.com
OPENAI_API_KEY=<research-project-only-openai-key>
RESEARCH_OPENAI_MODEL=gpt-5-mini-2025-08-07
# The import route allows 120 seconds; values below 90 seconds are ignored so
# legacy 45-second settings cannot prematurely cancel direct-PDF processing.
RESEARCH_OPENAI_TIMEOUT_MS=100000
RESEARCH_OPENAI_MAX_OUTPUT_TOKENS=8000
RESEARCH_RETENTION_DAYS=30
RESEARCH_MAX_SUCCESSFUL_DRAFTS=5
RESEARCH_QUOTA_HMAC_SECRET=<at-least-32-character-random-string>
RESEARCH_PROMOTION_MIN_REVIEWED=25
# Current gpt-5-mini rates; re-check when changing the model:
RESEARCH_OPENAI_INPUT_COST_PER_MILLION=0.25
RESEARCH_OPENAI_OUTPUT_COST_PER_MILLION=2.00
CRON_SECRET=<at-least-16-character-random-string>
~~~

Never expose OPENAI_API_KEY as a NEXT_PUBLIC value or put it in Git. If the
key is absent, the portal records model-not-configured rather than pretending a
draft was created. If pricing rates are absent, the report shows token usage and
"Not configured" for cost instead of inventing a stale estimate. The daily
cleanup route compares CRON_SECRET to the bearer token sent by Vercel, then
removes expired PDFs and run metadata in batches.

The authenticated browser uploads the PDF directly to private Supabase Storage.
A Storage RLS policy permits only the exact object path of that owner's
initialized run while its state is uploaded. This avoids Vercel Functions'
4.5 MB request-body limit without leaving a reusable upload token after
deletion. The processing function receives only the run id, claims it once,
downloads the object with the service role, revalidates its bytes and PDF
signature, and recomputes the SHA-256 digest before model calls. Storage URLs
and provider file metadata use fixed opaque filenames, not the owner's original
filename.

The synchronous processing route has a 120-second Vercel duration. It reserves
the final 20 seconds for the attempt writes and quota outcome, and gives the
model request up to 100 seconds. The v4 extraction recipe uses GPT-5 mini with
minimal reasoning and low-detail PDF page images; PDF inputs still include both
the file's extracted text and page images. This makes scanned CARFAX reports
viable within the request budget while keeping a versioned strict output schema.

### Source-grounding fields

Each draft record includes a short evidence excerpt, the source page numbers,
record kind (`service`, `inspection`, or `registration`), reporter, and whether
the service action is itemized. These fields help participants decide whether a
row is a maintenance action or a report/source limitation; they do not add a
second LLM call.

City/state is optional and deliberately conservative. The model must preserve
`not-reported` rather than invent it, and the server overwrites every proposed
location unless it can deterministically match that provider to a printed
CARFAX review link in the document text. Multiple possible matches remain
`ambiguous`. The participant sees this low-priority context under collapsed
**Shop details**, not in the primary per-action review flow. No address, map
search, or name-only location guess is stored.

The research login uses the shared application code but the research Supabase
Auth tenant, so it is not the same session or user database as the owner app.
After sign-in, an allowlisted operator is routed only to the protected evidence
console; an invited participant is routed only to upload and review. Both reach
account deletion from the account menu, not the draft screen.

The research surface deliberately does not register the owner PWA service
worker or load Vercel Analytics / Speed Insights. They are not needed to run a
consented document study and this keeps the route-restricted research surface
free of injected script-routing dependencies. The owner app keeps those shell
integrations.

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
4. Use the anonymous paired metrics and source adjudication to classify the failure.
5. Make the parser or prompt change in the appropriate public/private boundary.
6. Re-run synthetic, licensed, or separately consented private fixtures before promotion.

### Failure triage

A failed PDF is an expected research observation; it must not consume a pilot
slot or become a silent generic error. The protected operator queue shows the
per-strategy status, safe error code, model, latency, token count, and provider
request ID. Vercel logs contain matching `research_import_attempt_failure`
events keyed only by opaque run ID. They never log the PDF, filename, VIN,
extracted text, draft, or provider response body.

`model-request-timeout` means the route cancelled the provider call before a
response arrived; it is distinct from a provider HTTP rejection, whose safe
status/code suffix is retained in `model-request-failed`. The original v1
high-detail, 45-second configuration is retained only in historical attempt
telemetry. The v2 bounded recipe, v3 source-grounding contract, and v4
source-limitation contract have distinct prompt versions, so their results are
never silently mixed.

Before inviting more participants after a deployment, verify that
`GET /sw.js` returns JavaScript without a redirect, the research browser
console is clean, and one consented synthetic or separately approved PDF
produces a visible paired-attempt outcome. A 201 response means the research
run was recorded; it does not by itself prove that either model attempt made a
reviewable draft.

The 30-day cohort is an evaluation pipeline, not permanent PDF-fixture storage.
A useful direct-PDF regression fixture still contains the source document, so
calling it de-identified would be misleading. Permanent real-document fixtures
require separate long-term consent and a private-engine workflow; until then,
use synthetic/redacted fixtures for durable regression tests.

## Paired extraction experiment

[ADR-017](../docs-lite/adr/ADR-017-paired-carfax-pdf-extraction-evaluation.md)
defines the next research decision. Every newly consented eligible PDF will run
both the current text-first baseline and a direct-PDF challenger. The owner sees
one deterministically assigned valid draft and corrects it as a normal product
experience; the protected operator view compares both attempts with that
correction and manually adjudicates material disagreements.

The implementation uses consent version research-cohort.v3, paired-attempt
storage, add/remove visit review, private-PDF deletion, anonymous durable
measurements, and a separately authorized operator report. No older v2 upload
is automatically reprocessed. The first version uses the report, not per-upload
email.

## Product-owner results

Add your email to RESEARCH_OPERATOR_ALLOWLIST, then open:

~~~text
https://research.vehicleos.app/research/admin
~~~

The default report shows cohort progress; per-strategy usable-draft,
schema-valid, and attempt-failure rates across all paired attempts, including
documents that produced no reviewable draft; correction burden, service-line
precision/recall, omissions, owner-rejected lines, source-unclear visits,
p50/p95 latency, tokens, and configured cost; plus a source-adjudication
queue.
It will not recommend a strategy before RESEARCH_PROMOTION_MIN_REVIEWED
source-verified paired reviews. Pending disagreements and owner labels marked
for correction are excluded from the decision sample. After that evidence
floor, transparent safety and quality gates produce decision support, never an
automatic production switch.

Routine report reads contain no raw PDF, filename, VIN, provider, evidence, or
full draft. Choosing Inspect source creates an audit event and a five-minute
private PDF URL. The operator records confirmed, corrected, or not-required;
notes must not copy personal data.

### Usage and billing boundary

The cohort report derives per-attempt token counts from the Responses API
response, measures request latency in the application, and calculates an
estimated cost from versioned, configured model rates. It can therefore
compare the text-first and direct-PDF arms using the same model key without
pretending that an OpenAI invoice identifies an experiment arm.

Account billing is a separate source of truth. If a future finance
reconciliation is needed, run a scheduled internal-only job with a separately
held OpenAI Admin credential, aggregate by day/model, and compare the result
with the cohort's summed estimates. Do not add an Admin key to Vercel's
research request path, the browser, or this pilot's required environment.

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

Related: ADR-009, ADR-011, ADR-016, ADR-017, and evals/README.md.

For the narrower interview-facing definition of what this study evaluates, how
participants create source labels, and which metrics do not treat skipped or
unitemized rows as model success, see
[CARFAX paired extraction evaluation](../evals/carfax-paired-extraction-evaluation.md).
