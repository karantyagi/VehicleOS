# ADR-019 — VIN-assisted, owner-selected schedule identity

**Status:** Accepted
**Deciders:** Product / architecture
**Related:** [ADR-012](./ADR-012-product-catalog-vs-owner-runtime.md) · [ADR-010](./ADR-010-deterministic-service-matching-and-oem-knowledge-packs.md)

## Context

A VIN can make initial vehicle setup easier, but a VIN decoder is not an OEM
maintenance source and it cannot reliably identify the exact trim or schedule
variant. VehicleOS must never turn a partially decoded VIN into the wrong OEM
maintenance plan. At the same time, early access supports only vehicles with a
reviewed OEM schedule pack, so free-form year/make/model entry would promise a
plan the product cannot safely provide.

## Decision

1. **The verified schedule catalog remains the gate.** An owner creates a car
   only by selecting an `auto_verified` catalog row. The server independently
   enforces the same rule; a browser client cannot attach an unsupported YMM
   to an OEM pack.
2. **VIN lookup is optional assistance, not authority.** With a full 17-character
   VIN, the authenticated app calls the public NHTSA vPIC decoder through a
   server-side, no-store proxy with a short timeout. A timeout or provider error
   never blocks the owner from using the supported-vehicle picker.
3. **External names map only through a versioned canonical-alias registry.**
   `vehicle-identity-aliases.v1.json` is Plane A product knowledge. Its
   canonical labels are the labels in the verified OEM schedule catalog, and
   every alias names the OEM pack(s) that establish that identity. NHTSA data
   may propose a known identity; it may not create an alias, a catalog row, or
   an OEM schedule.
4. **The owner selects the exact trim and powertrain.** VIN lookup narrows the
   picker to verified year/make/model choices. It intentionally clears any
   existing trim selection and does not infer a pack from decoded `Trim` or
   `DriveType`. This is essential where a model has FWD/AWD or trim-specific
   schedules.
5. **Mismatches are visible and safe.** If a decoded vehicle has no verified
   schedule, VehicleOS does not create the vehicle; the owner can correct the
   VIN or request that vehicle. If the owner chooses a different supported YMM,
   setup names the conflict and cannot continue until it is resolved.
6. **Existing car identity is stable.** Updating an existing car may update
   mileage, ownership date, and VIN. Moving its history to a different schedule
   is rejected; the owner adds the corrected car to the garage instead. This
   prevents a schedule change from silently reinterpreting old service history.

## Privacy and reliability boundary

- The raw VIN is sent only from the authenticated app to the server proxy and
  then to NHTSA. It is not placed in a URL exposed to the browser, cached,
  logged by this feature, or added to ordinary product telemetry.
- The stored vehicle VIN remains the owner record supplied at setup; lookup
  results are transient setup assistance, not persisted evidence.
- vPIC is a free public descriptor service, not a source of schedule truth.
  If it is slow, unavailable, or incomplete, the curated catalog is still the
  complete and safe setup path.

## Alias-registry governance

Adding or changing an alias requires all of the following:

1. an already reviewed, `auto_verified` OEM schedule pack for the canonical
   product identity;
2. the canonical spelling, model year, trim, and powertrain checked against
   the OEM manual or manufacturer vehicle material used for that pack; and
3. a focused test proving the external name resolves only to the intended
   catalog candidates, without auto-selecting a pack.

The registry is deliberately small and explicit. Fuzzy matching is rejected:
being convenient is not a reason to make an owner’s schedule less certain.

## Consequences

- Owners can use a VIN to reach the right supported vehicle quickly while
  retaining the final schedule choice.
- VehicleOS clearly distinguishes *identity assistance* from *OEM schedule
  evidence*, preserving the catalog/runtime boundary in ADR-012.
- Adding a supported vehicle now has a small, auditable extension point for
  external decoder vocabulary rather than an unbounded normalization heuristic.

## Alternatives considered

### Let vPIC choose the trim and schedule pack

Rejected. Decoder trim/powertrain fields are often incomplete or inconsistent,
and VehicleOS supports only reviewed schedule variants.

### Accept arbitrary typed vehicle details, then add a generic schedule

Rejected. It weakens the early-access promise that every selectable vehicle has
a verified OEM schedule.

### Use an OEM database for real-time setup lookup

Rejected for this slice. OEM material remains the creator-side source for
curated packs. A runtime OEM dependency would make initial setup dependent on
multiple manufacturer systems and would not remove the owner’s trim decision.
