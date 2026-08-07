import { describe, expect, it, vi } from "vitest";
import { decodeVinIdentity, isFullVin, normalizeVinForLookup } from "./vin-identity-handlers.js";

const tlxPayload = {
  Results: [
    {
      Make: "ACURA",
      Model: "TLX",
      ModelYear: "2021",
      Trim: "TLX SH-AWD TECH",
      DriveType: "4WD/4-Wheel Drive/4x4",
    },
  ],
};

describe("VIN identity decoder", () => {
  it("normalizes a full VIN without accepting I, O, or Q", () => {
    expect(normalizeVinForLookup("19uub6f47ma-008400")).toBe("19UUB6F47MA008400");
    expect(isFullVin("19uub6f47ma-008400")).toBe(true);
    expect(isFullVin("19UUB6F47MA00840O")).toBe(false);
  });

  it("returns supported catalog guidance for the dogfood TLX without choosing a trim", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify(tlxPayload), { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    const result = await decodeVinIdentity("19UUB6F47MA008400", { fetchImpl });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      status: "supported",
      provider: "nhtsa_vpic",
      vehicle: {
        make: "ACURA",
        model: "TLX",
        year: 2021,
        trim: "TLX SH-AWD TECH",
        driveType: "4WD/4-Wheel Drive/4x4",
      },
      canonicalVehicle: { make: "Acura", model: "TLX", year: 2021 },
      matchingScheduleCount: 2,
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("does not attach an unsupported decoded car to any schedule", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({ Results: [{ Make: "Honda", Model: "Civic", ModelYear: "2021" }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await decodeVinIdentity("19UUB6F47MA008400", { fetchImpl });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      status: "unsupported",
      vehicle: { make: "Honda", model: "Civic", year: 2021 },
      matchingScheduleCount: 0,
    });
  });

  it("keeps onboarding usable when NHTSA is unavailable", async () => {
    const result = await decodeVinIdentity("19UUB6F47MA008400", {
      fetchImpl: async () => {
        throw new Error("network unavailable");
      },
    });

    expect(result).toEqual({
      status: 200,
      body: { status: "unavailable", provider: "nhtsa_vpic" },
    });
  });

  it("rejects malformed VINs before reaching NHTSA", async () => {
    const fetchImpl = vi.fn();
    const result = await decodeVinIdentity("not-a-vin", { fetchImpl });

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ code: "vin_invalid" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
