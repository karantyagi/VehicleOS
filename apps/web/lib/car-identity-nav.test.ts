import { describe, expect, it } from "vitest";
import { CAR_IDENTITY_GROUP_LABEL } from "./car-identity-nav";

describe("car identity navigation", () => {
  it("uses the owner-selected garage label", () => {
    expect(CAR_IDENTITY_GROUP_LABEL).toBe("Your garage");
  });
});
