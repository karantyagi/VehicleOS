import { describe, expect, it } from "vitest";
import {
  submitVehicleRequest,
  validateVehicleRequestInput,
} from "../http/vehicle-request-handlers.js";

describe("validateVehicleRequestInput", () => {
  it("requires year, make, model, trim, and email", () => {
    const result = validateVehicleRequestInput({
      year: 2022,
      make: "Honda",
      model: "Accord",
      trim: "Sport",
      contactEmail: "owner@example.com",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      year: 2022,
      make: "Honda",
      model: "Accord",
      trim: "Sport",
      contactEmail: "owner@example.com",
    });
  });

  it("rejects invalid email", () => {
    const result = validateVehicleRequestInput({
      year: 2022,
      make: "Honda",
      model: "Accord",
      trim: "Sport",
      contactEmail: "not-an-email",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.body.code).toBe("contact_email_required");
  });

  it("rejects out-of-range year", () => {
    const result = validateVehicleRequestInput({
      year: 1800,
      make: "Honda",
      model: "Accord",
      trim: "Sport",
      contactEmail: "owner@example.com",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.body.code).toBe("invalid_year");
  });
});

describe("submitVehicleRequest", () => {
  it("accepts a valid request and returns requestId", async () => {
    const result = await submitVehicleRequest({
      year: 2019,
      make: "Honda",
      model: "Civic",
      trim: "EX",
      note: "Need this for my daily driver.",
      contactEmail: "owner@example.com",
      source: "onboarding",
      userId: "user-123",
    });

    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({
      requestId: expect.any(String),
      message: expect.stringContaining("VehicleOS team"),
    });
  });
});
