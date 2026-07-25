import { describe, expect, it } from "vitest";
import { isCarfaxNoiseLineItem, normalizeCarfaxLineItems } from "./normalize-carfax-line-items.js";

describe("normalizeCarfaxLineItems", () => {
  it("strips CARFAX boilerplate noise", () => {
    expect(
      normalizeCarfaxLineItems([
        "Vehicle serviced",
        "Maintenance inspection completed",
        "Oil and filter changed",
      ]),
    ).toEqual(["Oil and filter changed"]);
  });

  it("keeps inspection context when only noise plus inspections remain", () => {
    expect(
      normalizeCarfaxLineItems([
        "Vehicle serviced",
        "Passed safety inspection",
        "Passed emissions inspection",
      ]),
    ).toEqual(["Passed safety inspection", "Passed emissions inspection"]);
  });

  it("falls back to service visit when row is noise-only", () => {
    expect(
      normalizeCarfaxLineItems(["Vehicle serviced", "Vehicle washed/detailed"]),
    ).toEqual(["Service visit"]);
  });

  it("removes car wash detail noise", () => {
    expect(
      normalizeCarfaxLineItems([
        "Vehicle serviced",
        "Front brake pads replaced",
        "Vehicle washed/detailed",
      ]),
    ).toEqual(["Front brake pads replaced"]);
  });
});

describe("isCarfaxNoiseLineItem", () => {
  it("matches case-insensitive boilerplate", () => {
    expect(isCarfaxNoiseLineItem("VEHICLE SERVICED")).toBe(true);
    expect(isCarfaxNoiseLineItem("Oil and filter changed")).toBe(false);
  });
});
