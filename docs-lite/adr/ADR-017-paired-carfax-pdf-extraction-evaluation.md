# ADR-017 - Paired evaluation of text-first and direct-PDF extraction

**Status:** Implemented; deployment migration and consented smoke test pending (2026-08-02)
**Deciders:** Product / architecture
**Related:** ADR-009 (PDF record import) - ADR-011 (assistant review) -
ADR-016 (isolated import research cohort)

## Context

The research cohort currently has one extraction path:

```text
CARFAX Print-to-PDF
  -> pdf-parse extracts selectable text
  -> GPT receives bounded text plus the VehicleOS output schema
  -> owner reviews one draft
```

This baseline is inexpensive, inspectable, and limits the data sent to the
model provider. It can still lose layout and cannot recover image-only pages.
OpenAI's Responses API can also receive a PDF as a file input, allowing a
vision-capable model to use embedded text and page images while producing the
same schema-bound draft.

Replacing the baseline immediately would be an architectural guess. Running
the two strategies on different documents would also confound input quality
with strategy quality. The research surface exists to make this decision from
paired owner-authorized evidence.

## Decision

Every eligible PDF uploaded to the research surface will produce two isolated
extraction attempts against the same document:

| Strategy | Input to model | Purpose |
| --- | --- | --- |
| `text-first` (baseline) | Bounded text extracted by `pdf-parse` | Current low-cost, inspectable path |
| `direct-pdf` (challenger) | The owner-authorized PDF as a file input | Test whether page layout and visual content improve extraction |

The comparison will hold the model family, public extraction contract, output
schema, and validation rules constant where the provider supports it. The
input representation is the experimental variable. Both attempts use
`store: false`, have no tools, and have no product or event-store write path.
Every paired outcome is recorded before owner review so extraction-rate,
latency, token, and cost results include total failures rather than only
surviving reviewable drafts.

### What the owner sees

The owner sees exactly **one ordinary review draft**, not two model outputs and
not the words baseline or challenger.

1. Before extraction results are known, VehicleOS assigns the run to a display
   arm using a deterministic balanced assignment recorded on the run.
2. Both attempts run, but only the assigned valid draft is displayed.
3. If the assigned attempt fails schema or safety validation and the other
   attempt is valid, VehicleOS displays the valid fallback and records the
   override. It never silently merges the drafts.
4. If neither attempt is valid, the owner sees a clear processing failure.
5. The owner can add, remove, and edit visits before saving the corrected
   draft. Nothing is written to the owner product.

Showing one draft preserves a normal product experience. Showing both would
make friends compare models instead of verify their vehicle history, increase
cognitive load, and bias the resulting label. An automatic "best-of-two"
selector is also rejected because it would introduce another unvalidated model
or heuristic before ground truth exists.

### What the product builder sees

The system of record is a protected research-operator comparison view, not an
email inbox. For each run it shows:

- displayed strategy and any fallback override;
- both attempt statuses and version identifiers;
- a field- and service-line diff between both drafts and the owner correction;
- schema validity, omissions, unsupported/hallucinated rows, and correction
  burden;
- latency, input/output tokens, estimated cost, and error class; and
- whether manual source adjudication is still required.

The default operator view must not render the raw PDF, VIN, extracted text, or
full model output until an authorized operator deliberately opens that run.
Every raw-document access should be attributable to an operator identity.

No per-upload email is part of the first implementation. Email is a poor
comparison surface and risks leaking personal data through subjects, previews,
forwarding, and provider retention. A later activity digest may contain only
counts and authenticated deep links. Immediate operational alerts are limited
to failures such as retention cleanup backlog, deletion failure, spend-limit
breach, or a sustained extraction outage; they contain no owner content.

### How the strategy is selected

The owner-corrected draft is the primary label, but it is not treated as
perfectly independent: owners may be anchored by the draft they saw. Runs with
whole-visit disagreement, hallucination, or a promotion decision therefore
receive manual source adjudication against the PDF.

The comparison uses paired, document-level results:

| Dimension | Decision use |
| --- | --- |
| Schema validity | Hard requirement for a reviewable draft |
| Service-line precision | Detect unsupported or hallucinated work |
| Service-line recall | Detect omitted visits and work items |
| Date, mileage, provider accuracy | Measure field correctness |
| Correction burden | Approximate owner effort, including add/remove operations |
| Latency and cost | Confirm the product interaction remains viable |
| Failure coverage | Determine whether direct PDF is a general replacement or a targeted fallback |

The challenger is promoted only when reviewed evidence shows a material quality
improvement without a safety regression and with acceptable latency and cost.
No accuracy claim or threshold result is published before it is measured.

Possible outcomes are deliberately broader than "challenger wins":

- promote `direct-pdf` as the default;
- retain `text-first` as the default and use `direct-pdf` only for low-text or
  layout-risk documents;
- retain `text-first` because quality is equivalent at lower cost and lower
  data exposure; or
- keep both in research because the evidence is inconclusive.

## Data model and execution boundary

The research run owns the document, consent, display assignment, owner
correction, and retention deadline. A child extraction-attempt record owns the
strategy-specific draft and telemetry.

```text
research_import_run
  |- consent + document hash + retention + displayed_strategy
  |- extraction_attempt[text-first]
  |- extraction_attempt[direct-pdf]
  |- owner_corrected_draft
  `- anonymous_comparison_observation (run link removed on deletion)
```

An attempt records strategy, status, model, prompt-contract version, schema
version, latency, token/cost metadata, error class, and draft. It does not
duplicate the raw PDF. Full golden fixtures and tuned scoring remain in the
private engine; the public repository contains the contract and methodology.

For the small research cohort, the two attempts may run concurrently so the
owner waits for the slower assigned path rather than the sum of both calls.
If background execution is introduced later, it must use a durable job record;
the system must not rely on untracked work after a serverless response returns.

## Privacy and security analysis

### Data classification and purpose

A CARFAX report can contain a VIN, vehicle attributes, mileage, ownership and
registration history, accidents, service dates, shop locations, and sometimes
owner or dealer identifiers. Combined, these fields can reveal an individual's
movements, behavior, and valuable property history. Treat the PDF, extracted
text, both model drafts, and the owner correction as sensitive owner data.

Use is purpose-limited to evaluating and improving vehicle-history import. It
must not be used for advertising, unrelated profiling, model training, or
product event creation.

### Material consent change

The current consent states that extracted text, not the PDF, is sent to the AI
provider. The challenger changes that boundary by sending the complete PDF,
including its images and metadata.

Therefore:

1. Direct-PDF execution is blocked until a new versioned consent explicitly
   states that the full PDF is sent to the model provider for comparison.
2. Previously uploaded documents are not run through the challenger without
   renewed consent.
3. The owner must be told that the research comparison does not update their
   VehicleOS history and may approximately double model processing.
4. Account/document deletion removes the research PDF, both attempts, and the
   owner correction. Only anonymous counts and ratios remain; they contain no
   source values or account identifier.
5. A useful permanent direct-PDF fixture still contains a source document.
   Keeping one requires separate long-term consent, not a claim that the source
   became de-identified automatically.

### Storage and access

- Keep the research deployment, database, Auth tenant, Storage bucket, and
  credentials separate from owner production.
- Keep the bucket private and owner-scoped. Use Row Level Security for browser
  access; the service credential remains server-only and is never exposed to
  the client.
- Use opaque object keys. Do not put email, VIN, plate, or filename content in
  URLs, logs, traces, or analytics.
- Require a distinct operator authorization policy for the comparison view;
  cohort membership alone must not grant access to other owners' runs.
- Do not attach reports or model content to email. Authenticated, expiring deep
  links are the maximum content allowed in a later digest.

### Model-provider boundary

- Send both model requests with `store: false`.
- Prefer request-scoped PDF input rather than persistent `/v1/files` storage.
  If the Files API is required, set an expiry and delete the provider file as
  soon as both the response and deletion audit record are complete.
- The participant notice must retain the provider abuse-monitoring caveat:
  `store: false` is not a promise of zero provider retention.
- Use a research-only API project and server key, rate limits, spend alerts,
  and auto-recharge disabled during the cohort.
- Record provider request identifiers and privacy-safe usage metadata, never
  raw prompts, PDF bytes, extracted text, or responses in ordinary telemetry.

### Untrusted-document and model-output boundary

The PDF is untrusted input. It can contain malformed objects, hidden text,
document metadata, or instructions intended to manipulate a multimodal model.

- Enforce file-size, MIME, PDF-signature, page/count, parse-time, and resource
  limits; reject encrypted or unreadable documents rather than bypass controls.
- Instruct the model that document content is evidence, never instructions.
- Give extraction models no tools, network access, secrets, cross-user context,
  or write capability.
- Require strict structured output plus independent server validation.
- Treat both drafts as untrusted proposals. Render values as text, never HTML,
  and never execute document- or model-produced markup.
- Preserve the existing human confirmation boundary; no research output can
  reach the owner event store.

### Retention, deletion, and audit

- Continue bounded raw-document retention, currently 30 days by default.
- Apply the same deletion deadline to both extraction attempts and the owner
  correction. Anonymous comparison measurements may outlive the run.
- Cleanup must delete the object through the Storage API as well as database
  metadata; a database-row delete alone is not proof that object bytes were
  removed.
- Track cleanup and participant-deletion outcomes without logging owner data.
  Deletion failures must remain retryable and visible to the operator.
- Keep an audit trail for consent version, strategy assignment, fallback,
  operator access, adjudication, and privacy-safe deletion outcomes.

### Source rights and acquisition

This ADR authorizes only owner-uploaded copies that the participant represents
they are permitted to use for this research purpose. It does not authorize
browser automation, credential collection, scraping, or systematic retrieval
from CARFAX. Any future provider-connected acquisition requires a separate
legal/product decision and, where applicable, provider permission.

## Alternatives considered

| Alternative | Reason not selected |
| --- | --- |
| Replace text-first with direct PDF immediately | No paired evidence; expands data disclosure and cost before benefit is measured |
| Run challenger only when text extraction fails | Tests failure recovery but cannot measure head-to-head quality on normal documents |
| Show baseline to every owner | Produces labels consistently anchored to the baseline and never tests challenger review burden |
| Show challenger to every owner | Exposes every participant to an unproven path |
| Show both drafts to the owner | Adds cognitive load and turns an owner into a model evaluator |
| Merge or judge both drafts automatically | Introduces another unvalidated model/heuristic and obscures provenance |
| Email every upload and comparison | Creates notification noise and a new sensitive-data exfiltration surface |

## Consequences

- Every eligible document adds a second model request. Total cost may more than
  double because direct-PDF input can include page images; actual usage must be
  measured.
- The challenger expands third-party data disclosure from bounded text to the
  full PDF, requiring new consent and stricter provider-file deletion controls.
- Paired attempts reduce document-variation confounding and produce a clearer
  interview-grade architecture decision.
- Deterministic display assignment lets the cohort exercise both experiences,
  but manual adjudication remains necessary because corrections can be anchored
  to the displayed draft.
- Implementation requires a child-attempt schema, add/remove visit review UX,
  a protected comparison report, and retention/deletion coverage for both
  attempts.

## Implementation status

The branch implements:

1. Versioned full-PDF provider consent and participant copy.
2. The extraction-attempt data model and deterministic display assignment.
3. Request-scoped direct-PDF extraction without persistent provider files.
4. Owner controls to add and remove whole visits.
5. A protected operator comparison report and manual-adjudication queue.
6. Deletion, retention, authorization, prompt-injection, and telemetry coverage.
7. Authenticated, exact-path RLS browser-to-Supabase upload so the 15 MB
   contract does not cross the Vercel Function request-body boundary.

Activation still requires applying research migration 002, adding the operator
environment settings, deploying, and running one consented smoke document.

## Interview articulation

> We did not replace a deterministic parser because a multimodal model looked
> promising. We ran text-first and direct-PDF extraction on the same consented
> documents, exposed one blinded draft to preserve a normal owner experience,
> used owner correction plus manual adjudication as evidence, and promoted a
> strategy only after quality, hallucination, latency, cost, and privacy gates.

## External evidence

- [OpenAI developer quickstart - PDF and file input](https://platform.openai.com/docs/quickstart/make-your-first-api-request)
- [OpenAI API data controls and retention](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [OWASP prompt-injection prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- [CARFAX consumer terms of use](https://www.carfax.com/company/terms-of-use)
