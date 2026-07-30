# VehicleOS MVP Technical Spec

## Audiences

**Daily drivers** (primary) use the hosted web app at `app.vehicleos.app` — no terminal required.  
See [`user-surfaces.md`](./user-surfaces.md).

---

## MVP Goal

Deliver one credible, end-to-end ownership workflow that proves the architecture:

Upload a maintenance receipt, extract structured service data, update vehicle state, generate the next recommended action, and let the user approve or dismiss that task.

## Primary User Flow

1. User creates a vehicle profile with VIN, year, make, model, mileage, and current odometer.
2. User uploads a service receipt.
3. System stores the document and runs OCR and structured extraction.
4. User reviews extracted fields if confidence is low.
5. System records a `service.recorded` event.
6. Projection updates the vehicle timeline and current service state.
7. Rules engine calculates the next maintenance need.
8. System creates a proposed task with explanation and supporting evidence.
9. User approves, dismisses, or snoozes the task.

## Maintenance item intelligence

Facts, descriptive insights, assistant recommendations, and owner interval
decisions are separate layers. A low or variable evidence state must not hide
useful service history or owner controls.

Rotate Tires is the first complete item-specific policy. All maintenance items
share the same rationale axes and collapsed-by-default interaction; item
evaluators beyond Rotate Tires are Phase 2.

The reminder owns `what / when / why now`. A separate action recommendation
owns `how / where / expected time and cost / why this option`. The two outputs
have separate confidence and evidence. The initial Rotate Tires pilot uses TLX
service history and owner memory to propose a Costco fulfillment plan while
requiring owner confirmation for the continuing `$0` benefit.

See:

- [`maintenance-item-intelligence.md`](./maintenance-item-intelligence.md)
- [`maintenance-item-intelligence-queue.md`](./maintenance-item-intelligence-queue.md)
- [ADR-014](../../docs-lite/adr/ADR-014-owner-centered-maintenance-item-intelligence.md)
