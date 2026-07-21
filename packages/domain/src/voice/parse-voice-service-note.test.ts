import { describe, expect, it } from "vitest";
import { parseVoiceServiceNote } from "./parse-voice-service-note.js";

describe("parseVoiceServiceNote", () => {
  it("extracts shop, mileage, service, and total from a spoken note", () => {
    const parsed = parseVoiceServiceNote({
      transcript: "Changed oil at dealer, 62,200 miles, $110",
      referenceDate: "2026-07-21T12:00:00.000Z",
    });

    expect(parsed).toMatchObject({
      shop: "dealer",
      mileage: 62_200,
      total: "$110",
      lineItems: ["Oil change"],
    });
    expect(parsed?.confidence).toBeGreaterThan(0.8);
  });

  it("uses vehicle mileage when spoken note omits odometer", () => {
    const parsed = parseVoiceServiceNote({
      transcript: "Oil change at Jiffy Lube today",
      defaultMileage: 41_800,
      referenceDate: "2026-07-21T12:00:00.000Z",
    });

    expect(parsed?.mileage).toBe(41_800);
    expect(parsed?.shop).toBe("Jiffy Lube today");
    expect(parsed?.lineItems).toContain("Oil change");
  });

  it("returns null for empty transcript without mileage fallback", () => {
    expect(parseVoiceServiceNote({ transcript: "   " })).toBeNull();
    expect(parseVoiceServiceNote({ transcript: "just checking in" })).toBeNull();
  });
});
