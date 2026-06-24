# VehicleOS MVP Technical Spec

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
