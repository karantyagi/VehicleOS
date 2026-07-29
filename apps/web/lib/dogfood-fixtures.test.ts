import { describe, expect, it } from "vitest";
import {
  DEFAULT_DOGFOOD_FIXTURE_ID,
  DOGFOOD_FIXTURE_PROFILES,
  getDogfoodFixtureProfile,
} from "./dogfood-fixtures";

describe("dogfood fixtures", () => {
  it("lists both end-to-end dogfood profiles", () => {
    expect(DOGFOOD_FIXTURE_PROFILES.map((profile) => profile.id)).toEqual([
      "karan-tlx",
      "ayush-elantra",
    ]);
  });

  it("resolves profile URLs for CARFAX and RMV imports", () => {
    const tlx = getDogfoodFixtureProfile("karan-tlx");
    expect(tlx.carfaxUrl).toBe("/dogfood/karan-tlx/carfax-history.v1.json");
    expect(tlx.rmvUrl).toBe("/dogfood/karan-tlx/rmv-records.v1.json");

    const elantra = getDogfoodFixtureProfile("ayush-elantra");
    expect(elantra.carfaxUrl).toBe("/dogfood/ayush-elantra/carfax-history.v1.json");
    expect(elantra.rmvUrl).toBe("/dogfood/ayush-elantra/rmv-records.v1.json");
  });

  it("falls back to default profile for unknown ids", () => {
    expect(getDogfoodFixtureProfile("missing" as typeof DEFAULT_DOGFOOD_FIXTURE_ID).id).toBe(
      DEFAULT_DOGFOOD_FIXTURE_ID,
    );
  });
});
