# PROC-KB 2,000-pack OEM PDF source registry

This directory preserves the public source-research artifacts generated on
July 25, 2026 for the VehicleOS OEM knowledge-pack factory.

## Artifacts

- `tier-2000-pack-targets.csv` — the 2,000-row input identity and policy list.
- `tier-2000-oem-manual-sources.csv` — the validated 2,000-row source registry.
- `tier-2000-oem-manual-sources-summary.md` — outcome, coverage, and QA summary.
- `tier-2000-blocked-luxury-queue.md` — priority-ordered follow-up queue for
  the 297 blocked luxury packs.

The targets CSV is an input rather than a generated output, but it is committed
with the results so another workstation can reproduce identity, ordering, and
manual-sharing checks without depending on the original machine.

## Validation snapshot

- 2,000 rows and 2,000 unique `pack_id` values.
- Exact 24-column output schema and priorities 1 through 2,000.
- 1,076 usable Tier A/B/C rows and 924 explicitly blocked Tier D rows.
- 263 distinct referenced PDF URLs checked for HTTP 200,
  `application/pdf`, `%PDF` signature, and response size greater than 10 KB.
- 722 shared-manual rows retain `manual_share_applied`,
  `shared_from_pack_id`, confidence, and explanatory provenance.

These checks describe the completed July 25, 2026 validation run. URL
availability is external state and should be revalidated before a later
production ingestion.

## Source-file integrity

SHA-256 hashes of the preserved artifacts:

```text
tier-2000-blocked-luxury-queue.md       168348659201593D2DFFAC756B9B6B526B6E96F9E731E884AEAE88B055CDF218
tier-2000-oem-manual-sources.csv        1EA619113C46452C504C2A3C720583FBA8621D75B7E9503523DE8CE9698DA6AD
tier-2000-oem-manual-sources-summary.md 324A6682671DF6B3EFEA01EC80F254FA670B0B6A6AD285A0479EB518A75E3E27
tier-2000-pack-targets.csv              C4E72146D9BDDD6450A19884AFD72ABE758FF9E055AEC093A451FF48AF173ED7
```

This registry contains public OEM document references and research
provenance. It does not contain private engine prompts, tuned scoring logic,
or golden fixtures.

## In-review source retry v2

`tier-2000-oem-manual-sources-v2.csv` is a targeted source result for the 469
packs in `tier-2000-in-review-retry.csv`; it is not a replacement 2,000-row
registry.

The July 26, 2026 retry produced:

- 347 Tier B rows, 20 Tier C rows, and 102 Tier D rows.
- 367 sourced rows with HTTP 200, `application/pdf`, `%PDF`, size greater than
  50 KB, and a current SHA-256 value.
- Five Volvo delivery URLs refreshed to their direct official Contentstack
  assets after the prior URLs returned HTTP 403.
- No NHTSA-hosted PDFs. The existing Audi schedules were not recycled because
  they had already produced dual-extract mismatches; those 102 rows remain
  explicitly blocked pending a different complete maintenance document.

### Source acquisition policy

An OEM-hosted PDF is preferred but not mandatory. The retry workflow may query
reputable manual aggregators and collection portals after the OEM path fails.
An aggregator is a discovery/transport provider; it is not authority by itself.

- **Tier B:** OEM-hosted, applicable, complete, and byte-validated.
- **Tier C:** non-OEM mirror with attributable OEM publisher identity; correct
  US-market YMM/generation; complete maintenance section; byte-validated.
- **Tier D:** applicability, completeness, maintenance content, provenance, or
  retrieval could not be verified.

Do not accept a document from its cover alone. Verify the actual maintenance
section, model/generation and powertrain applicability, edition/document
number, market, page completeness, HTTP 200, `application/pdf`, `%PDF`, size,
and SHA-256. Preserve publisher, provider/host, original and mirror URLs,
retrieval date, confidence, and manual-sharing provenance.

Before integrating an aggregator, compare 2–3 candidates on retry-pack
coverage, YMM/market correctness, maintenance-section presence, direct-PDF
access, duplicate rate, URL stability, and terms/licensing risk. Provider
ranking and portal-specific production heuristics belong in the private engine;
the public repository retains the provider contract and validation method.

Technical validation does not grant redistribution rights. Keep source PDFs
local or in controlled evidence storage unless the applicable terms permit
redistribution.

SHA-256:

```text
tier-2000-oem-manual-sources-v2.csv 58EB3F352E0BFBE95061ED34036D0275C2CCB9862A67462D5C4B37EFFCDAD0F3
```
