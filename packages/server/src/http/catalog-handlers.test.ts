import { describe, expect, it } from "vitest";
import { assertVehicleCreateAllowed, listSupportedVehicles } from "../http/catalog-handlers.js";

describe("listSupportedVehicles", () => {
  it("returns auto_verified vehicles without throwing", () => {
    const result = listSupportedVehicles({ verifiedOnly: true, limit: 5 });

    expect(result.status).toBe(200);
    expect(result.body.total).toBeGreaterThan(0);
    expect(result.body.vehicles?.length).toBeLessThanOrEqual(5);
    expect(result.body.vehicles?.every((row) => row.supported)).toBe(true);
  });

  it("returns full verified catalog count for onboarding YMM picker", () => {
    const result = listSupportedVehicles({ verifiedOnly: true, limit: 1 });

    expect(result.status).toBe(200);
    expect(result.body.total).toBeGreaterThanOrEqual(50);
  });
});

describe("assertVehicleCreateAllowed", () => {
  it("allows auto_verified dogfood vehicle", () => {
    const result = assertVehicleCreateAllowed({
      year: 2021,
      make: "Acura",
      model: "TLX",
      trim: "SH-AWD",
    });

    expect(result).toEqual({
      ok: true,
      packId: "acura-tlx-2021-sh-awd",
    });
  });

  it("allows promoted Kia K5 after Phase C", () => {
    const result = assertVehicleCreateAllowed({
      year: 2024,
      make: "Kia",
      model: "K5",
      trim: "LXS",
    });

    expect(result).toEqual({
      ok: true,
      packId: "kia-k5-2024-lxs",
    });
  });

  it("rejects unknown vehicle", () => {
    const result = assertVehicleCreateAllowed({
      year: 2019,
      make: "Honda",
      model: "Civic",
      trim: "EX",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(422);
    expect(result.body.waitlistEligible).toBe(true);
  });

  it("requires trim", () => {
    const result = assertVehicleCreateAllowed({
      year: 2021,
      make: "Acura",
      model: "TLX",
      trim: "",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
  });
});
