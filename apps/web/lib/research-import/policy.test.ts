import { describe, expect, it } from "vitest";
import { isResearchCohortSurface, isResearchParticipantAllowed, parseResearchAllowlist } from "./policy.js";

describe("research cohort access policy", () => {
  it("normalizes the explicit invite allowlist", () => {
    expect([...parseResearchAllowlist(" Friend@Example.com, second@example.com ,,")]).toEqual([
      "friend@example.com",
      "second@example.com",
    ]);
  });

  it("allows only explicitly invited signed-in participants", () => {
    expect(
      isResearchParticipantAllowed(
        { id: "user-1", email: "FRIEND@example.com" },
        { allowlist: "friend@example.com", authDisabled: "false" },
      ),
    ).toBe(true);
    expect(
      isResearchParticipantAllowed(
        { id: "user-2", email: "other@example.com" },
        { allowlist: "friend@example.com", authDisabled: "false" },
      ),
    ).toBe(false);
  });

  it("is only active in the dedicated research deployment", () => {
    expect(isResearchCohortSurface("research-cohort")).toBe(true);
    expect(isResearchCohortSurface("owner-app")).toBe(false);
  });
});
