# CARFAX paired extraction evaluation

**Purpose:** Evaluate whether a model can turn a consented CARFAX PDF into a
faithful, structured service-history proposal, and whether direct PDF input is
worth its additional latency, cost, and data exposure compared with
text-first extraction.

This is an applied-AI evaluation design, not a published benchmark or an
accuracy claim. Actual cohort results are reported only after the study has
enough source-verified reviews.

## The decision this evaluation supports

The research cohort holds the model family, public output contract, and
server-side validation rules constant while it compares two inputs from the
same owner-authorized document:

| Strategy | Model input | Question |
| --- | --- | --- |
| `text-first` | Selectable PDF text extracted by the server | Is the lower-cost text representation sufficient? |
| `direct-pdf` | The original PDF as a request-scoped file input | Do layout and page images materially improve faithful extraction? |

The decision is not whether an LLM is generally capable. It is whether the
direct-PDF strategy improves this narrow extraction task enough to clear
quality, safety, latency, cost, and privacy gates. See
[ADR-017](../docs-lite/adr/ADR-017-paired-carfax-pdf-extraction-evaluation.md)
for the system and privacy decision.

## What AI capability is being evaluated

The evaluated capability is **document-to-schema extraction**:

```text
CARFAX PDF --> schema-bound service-history proposal --> human source label
```

| Capability | Evaluation question |
| --- | --- |
| Document understanding | Did the attempt read the relevant text, layout, and pages? |
| Field extraction | Did it capture the correct service date, mileage, provider, record kind, reporter, and source evidence? |
| Visit grouping | Did it keep facts and service actions from the same visit together? |
| Service-action extraction | Did it capture work performed without adding unsupported work? |
| Evidence grounding | Is each proposal traceable to the source document? |
| Uncertainty handling | Did it preserve an unclear visit as unclear rather than inventing detail? |
| Structured-output reliability | Did the response satisfy the public schema and server validation? |

This evaluation does **not** measure mechanical diagnosis, maintenance
recommendation quality, general chat quality, owner-memory accuracy, or
map-based shop-location resolution. The research record carries optional
city/state metadata only to make the source easier to inspect: the model may
propose it, but the server retains it only after a deterministic match to the
provider's printed CARFAX review-link text. Otherwise it is `not-reported` or
`ambiguous`. It is shown under collapsed **Shop details** and is not a required
per-action label or an external lookup target.

## Who evaluates the output

The research participant is an **output-and-evidence evaluator**, not a prompt
evaluator and not a model-comparison judge. They should see one assigned draft
and compare it with their original CARFAX report. Showing both model outputs
would encourage model comparison instead of source verification and would bias
the label.

The protected operator view then compares both attempts with the participant's
label. When a material disagreement remains, the operator checks the source
PDF and records an adjudication. This keeps a participant's memory or a
draft-anchored correction from becoming unchallenged ground truth.

## Required human label protocol

Saving a draft without edits is not evidence that a visit was reviewed. A
completed evaluation needs one explicit outcome for every visit.

### Current implementation boundary

The current cohort gives the participant only two primary choices: **Looks
right** or **Fix it**. **Not a service visit** appears only within the
correction path. **Finish review** remains disabled until every visit has one
of these outcomes. **Save progress** is intentionally not a confirmation and
is never scored as model accuracy. The original proposal, the outcome labels,
and the corrected draft remain distinct for evaluation.

A visit-level confirmation deterministically confirms all itemized actions. If
CARFAX does not itemize the work, it records the action as source-limited
without asking the participant to choose a separate label. A compact correction
deterministically reconciles the old and edited action lists into corrected,
added, and unsupported labels. The operator retains per-action metrics, but
the participant performs one source check per visit.

### Visit-level outcome

| Outcome | Meaning for evaluation |
| --- | --- |
| Confirmed accurate | The date, mileage, provider, and visit are supported by the report. |
| Corrected | One or more visit fields were changed to match the report. |
| Not a visit | The proposed visit is unsupported and is removed. |

### Service-action outcome

These are derived or operator-level labels, not choices shown to the
participant.

| Outcome | Meaning for evaluation |
| --- | --- |
| Matches report | Supported service action; a likely true positive. |
| Corrected | The service wording or association with the visit was wrong. |
| Added | A service action was present in the report but omitted by the draft. |
| Not supported | The draft claimed work the report does not support; a false positive. |
| Not itemized in report | The visit is supported, but the report does not name the work. This is a source limitation, not an LLM error. |
| Unsure | Hold out of the promotion sample until source adjudication. |

The review UI should show progress for **all** visits, not merely a small
attention queue. A message such as "3 need attention" is a prioritization aid,
not permission to skip the remaining rows. Completion requires each visit to
be explicitly confirmed, corrected, or marked not a visit.

## How metrics are derived

The original proposed draft, the explicit human labels, and the final corrected
draft are all retained only within the bounded research-retention window. The
durable comparison measurement is anonymous and contains no PDF, VIN,
filename, provider, evidence excerpt, or participant identifier.

| Metric | Interpretation |
| --- | --- |
| Schema-valid and usable-draft rates | Can the strategy reliably produce a reviewable proposal? |
| Field accuracy | Are date, mileage, and provider correct against the source label? |
| Service-action precision | Of proposed actions that were reviewed, how many were supported? |
| Service-action recall | Of source-supported actions, how many did the draft include? |
| Unsupported actions | Count of claimed services rejected by the reviewer or operator. |
| Omitted actions | Count of source-supported services added by the reviewer or operator. |
| Source-visibility rate | Count of visits where the report did not itemize the work; this is not scored as an omission. |
| Correction burden | Explicit edits, additions, removals, and review time required from the owner. |
| Review completion rate | Whether every proposed visit and action received an outcome. |
| Latency, tokens, and estimated cost | Whether the more accurate path is viable in the owner interaction. |

An unreviewed row is **unknown**, not correct. A source-unavailable or
unresolved row is excluded from the corresponding accuracy denominator and is
reported separately. This avoids rewarding a strategy because the report was
vague or the participant skipped review.

## Paired analysis and validity limits

Each document produces both attempts, which removes document-layout variation
as the main explanation for a strategy difference. The owner sees one
deterministically assigned valid draft; the operator can later score both
attempts against the source-supported label.

This is still a small, consented cohort, so it has limits:

- It is an early product evaluation, not a statistically representative CARFAX
  benchmark.
- Participant corrections can be anchored by the draft they saw; material
  disagreements require source adjudication.
- It covers owner-supplied CARFAX PDFs, not arbitrary receipts, portals, or
  scanned vehicle documents.
- A PDF that does not itemize work tests source visibility as much as model
  extraction.
- No strategy is promoted from a handful of successful examples. The cohort
  requires a defined floor of source-verified paired reviews and no safety
  regression before a decision is supported.

## Why this is interview-relevant

The interview signal is not "we called an LLM on a PDF." It is that VehicleOS
treats model output as an uncertain, privacy-sensitive proposal and builds an
evaluation loop around it:

1. isolate consented research data from production writes;
2. hold the extraction contract constant while testing an input variable;
3. make people verify source facts instead of comparing model prose;
4. measure unsupported claims, omissions, uncertainty, reliability, latency,
   and cost together; and
5. promote only after source-verified evidence, with deterministic domain
   systems retaining final authority.

> We evaluated a bounded document-understanding capability, not generic model
> intelligence. The model proposed service-history records; humans labeled each
> source-backed visit and action; the operator adjudicated ambiguity; and no
> proposal reached the owner event store automatically.

## Public/private boundary

This document describes the public methodology and schema-level evaluation
contract. Production-tuned prompts, private scoring logic, and full real-owner
golden fixtures remain in `vehicleos-engine`. See
[the open-core boundary](../docs/open-core-boundary.md).

## Related

- [Import Research Cohort](../docs/research-import-cohort.md)
- [ADR-017: paired CARFAX PDF extraction](../docs-lite/adr/ADR-017-paired-carfax-pdf-extraction-evaluation.md)
- [ADR-016: isolated import research cohort](../docs-lite/adr/ADR-016-isolated-import-research-cohort.md)
