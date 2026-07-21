import { describe, expect, it } from "vitest";
import { createEmptyVehicleState } from "../projections/apply.js";
import { detectServiceConflict } from "./detect-service-conflict.js";

describe("detectServiceConflict", () => {
  it("flags mileage lower than current projection", () => {
    const state = {
      ...createEmptyVehicleState("veh-1"),
      currentMileage: 42_000,
      timeline: [
        {
          serviceId: "svc-1",
          shop: "Dealer",
          serviceDate: "2026-01-01",
          mileage: 42_000,
          lineItems: ["Oil change"],
          total: "$50",
          evidenceIds: [],
        },
      ],
    };

    const conflict = detectServiceConflict(state, {
      mileage: 41_500,
      serviceDate: "2026-02-01",
    });

    expect(conflict?.kind).toBe("mileage_regression");
    expect(conflict?.verificationCode).toBe("VERIFY_ODOMETER");
  });

  it("flags service date before last timeline entry", () => {
    const state = {
      ...createEmptyVehicleState("veh-1"),
      currentMileage: 42_000,
      timeline: [
        {
          serviceId: "svc-1",
          shop: "Dealer",
          serviceDate: "2026-02-01",
          mileage: 42_000,
          lineItems: ["Oil change"],
          total: "$50",
          evidenceIds: [],
        },
      ],
    };

    const conflict = detectServiceConflict(state, {
      mileage: 42_100,
      serviceDate: "2026-01-15",
    });

    expect(conflict?.kind).toBe("date_regression");
    expect(conflict?.verificationCode).toBe("VERIFY_DATE");
  });

  it("returns null when evidence is consistent", () => {
    const state = {
      ...createEmptyVehicleState("veh-1"),
      currentMileage: 42_000,
      timeline: [],
    };

    expect(
      detectServiceConflict(state, { mileage: 42_500, serviceDate: "2026-03-01" }),
    ).toBeNull();
  });
});
