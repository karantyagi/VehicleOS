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
