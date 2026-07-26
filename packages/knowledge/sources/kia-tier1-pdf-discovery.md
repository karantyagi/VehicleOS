# Kia Tier-1 owner-manual PDF discovery

- **Verified:** 2026-07-26
- **Market / model year:** U.S. / 2024
- **Scope:** K5 LXS, Sportage LX, Telluride LX, EV6 Light

## Result

The four exact 2024 U.S. Kia owner manuals are available as stable public PDF
mirrors. Each mirror is byte-for-byte identical to the corresponding manual
retrieved from Kia's session-gated KGIS flow.

| Pack ID | Stable direct PDF mirror | KGIS iframe path | Bytes | SHA-256 |
|---|---|---|---:|---|
| `kia-k5-2024-lxs` | [2024 K5 Owner's Manual](https://manuals.startmycar.com/published/Kia-K5_2024_EN_US_e6ae80d227.pdf) | `/files/328/6531/2024 K5 OM (1).pdf` | 10,361,591 | `08797ec50531ff57391d62694a6deaa1a776a988b390c2a614691b7154f1d834` |
| `kia-sportage-2024-lx` | [2024 Sportage Owner's Manual](https://manuals.startmycar.com/published/Kia-Sportage_2024_EN-US_US_979e9e6749.pdf) | `/files/328/6581/2024 Sportage OM.pdf` | 9,401,466 | `e7c68bfae6f4de2105a82e83cf4eebc21bae6c6a397baf9730e98c20a70bfd5e` |
| `kia-telluride-2024-lx` | [2024 Telluride Owner's Manual](https://manuals.startmycar.com/published/Kia-Telluride_2024_EN_US_60a621055c.pdf) | `/files/328/6554/2024 Telluride OM (1).pdf` | 9,825,281 | `cbf0111a52380bc46c7bfcf7194602a7d2327965d227215cbf53561f1d511fcc` |
| `kia-ev6-2024-light` | [2024 EV6 Owner's Manual](https://manuals.opinautos.com/published/Kia-EV6_2024_EN-US_US_ef71c5ee49.pdf) | `/files/328/6586/2024 EV6 OM.pdf` | 9,755,105 | `742fc94e383aa56b2d70c9d92b3e173c9abbf47d5d7f397b9c93d29411820c39` |

## Direct-PDF checks

Fresh checks against every mirror returned:

```text
HTTP/1.1 200 OK
Content-Type: application/pdf
first five response bytes: %PDF-
```

The PDFs identify Kia America as the publisher and contain visually readable
normal-maintenance schedule tables. Browser PDF extraction also locates the
tables. The package's current `pdf-parse` path does not decode their embedded
table text reliably, so these sources must not be treated as a safe automatic
pack promotion.

## Maintenance schedule evidence

The page numbers below are PDF page indices from the checked files. Printed
manual pages are one page lower.

| Pack ID | PDF page | Visually verified schedule evidence |
|---|---:|---|
| `kia-k5-2024-lxs` | 461 (printed 8-11) | Normal turbo-model schedule; 8,000-mile / 12-month grid, 8,000-mile tire rotation, brake-fluid replacement at 48,000 miles / 48 months |
| `kia-sportage-2024-lx` | 455 (printed 8-10) | Normal schedule; 8,000-mile / 12-month grid, 8,000-mile / 12-month tire rotation, brake-fluid replacement at 48,000 miles / 48 months |
| `kia-telluride-2024-lx` | 470 (printed 8-10) | Normal schedule; 8,000-mile / 12-month grid, 8,000-mile tire rotation, brake-fluid replacement at 48,000 miles / 48 months |
| `kia-ev6-2024-light` | 494 (printed 9-8) | Normal EV schedule; 8,000-mile tire rotation, reduction-gear-fluid inspections, brake-fluid replacement at 48,000 miles / 48 months |

These values conflict with several generic factory-template values currently in
the four packs. The PDFs solve source acquisition, but the packs remain
`creator_review_required` until their services and citations are rebuilt from
the Kia tables.

## Kia / KGIS access findings

Kia's public manuals page is not a stable direct-PDF source:

1. `POST /apps/services/owners/apigwServlet.html` with API route `/cmm/gam`
   returns the exact 2024 documents through the pre-login flow.
2. Each document has a short-lived `accessPayload`.
3. The browser POSTs that token to
   `https://www.kiatechinfo.com/ext_If/kma_owner_portal/content_pop.aspx`.
4. KGIS creates a session and returns an HTML page containing the PDF iframe.
5. A direct unauthenticated GET to the iframe path returns `404`; the same GET
   with the KGIS session returns `200 application/pdf`.

Fresh `curl` checks on 2026-07-26:

| First-party target | HEAD result | First response bytes |
|---|---|---|
| `https://owners.kia.com/us/en/manuals.html` | `200`, `text/html` | `<!DOC` |
| K5 KGIS iframe URL without the session cookie | `404`, empty body | empty |
| Prior guessed EV6 `owners.kia.com/content/dam/...maintenance-schedule.pdf` | `403`, `text/html` | `<!DOC` |

Kia does publicly host feature-tip PDFs under `content/dam`, but those do not
contain the owner-manual maintenance schedule.

No adjacent model year or different vehicle was used. The removed Jeep pack is
outside this work.
