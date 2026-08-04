import { describe, expect, it } from "vitest";
import {
  isCarfaxLocationLookupApplicable,
  resolveCarfaxSourceTrust,
} from "./carfax-source-trust.js";

describe("resolveCarfaxSourceTrust", () => {
  it.each([
    ["Self Reported", "owner_reported", false],
    ["Self-Service (DIY)", "owner_diy", false],
    ["Massachusetts", "state_record", false],
    ["MetroWest Acura", "provider", true],
  ] as const)("classifies %s", (shop, trust, lookupApplicable) => {
    expect(resolveCarfaxSourceTrust(shop)).toBe(trust);
    expect(isCarfaxLocationLookupApplicable(shop)).toBe(lookupApplicable);
  });
});
