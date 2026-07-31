# Vehicle OS — RMV / DMV record import

Open-source **ownership record import format** for registration, title, lien, and related non-maintenance vehicle events from **RMV/DMV portal PDFs** (print-to-PDF on the Owner device).

**Product path (ADR-009):** Owner logs into myRMV (or state DMV portal) → Print/Save PDF → upload in **Record import** → assistant extracts → review → import.

These events feed **ownership context** for the assistant — they do not appear on the maintenance service history timeline.

## Schema

Driver license expiration from a supported RMV / DMV portal PDF is imported once as an owner credential, not as a vehicle record. It appears beside maintenance in the owner schedule, but never in service history; importing it from another vehicle does not duplicate it. Only the license class, issued date, expiration date, and passenger status are retained; date of birth, license number, and restrictions are excluded.

Capture it through **Add records** → **RMV / DMV records**: export the vehicle page from the supported myRMV portal as a PDF, then include the **Driver's license** row in the import review. The PDF is only the capture source; after import, the credential is attached to the owner across the garage.

`connectors/rmv-connect/schema/vehicleos-rmv-import.v1.json`

## Example

`examples/sample-rmv-import.v1.json`

## Hosted upload

1. Open **Record import** → **RMV / DMV records**
2. Upload PDF (extract) or JSON
3. Review ownership events → **Confirm import**

## Related

- [`docs-lite/adr/ADR-009-pdf-record-import.md`](../../docs-lite/adr/ADR-009-pdf-record-import.md)
- CARFAX maintenance import: [`../carfax-connect/README.md`](../carfax-connect/README.md)
