import { describe, expect, it } from "vitest";
import { assertVehicleCreateAllowed } from "../http/catalog-handlers.js";

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

  it("rejects creator_review_required catalog row", () => {
    const result = assertVehicleCreateAllowed({
      year: 2024,
      make: "Kia",
      model: "K5",
      trim: "LXS",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(422);
    expect(result.body.code).toBe("waitlist_required");
    expect(result.body.packId).toBe("kia-k5-2024-lxs");
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
