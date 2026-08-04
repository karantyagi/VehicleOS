import { describe, expect, it } from "vitest";
import {
  isResearchCohortPathAllowed,
  isResearchCohortSurface,
  isResearchOperatorAllowed,
  isResearchParticipantAllowed,
  parseResearchAllowlist,
  shouldEnableOwnerShellIntegrations,
} from "./policy.js";

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
    expect(shouldEnableOwnerShellIntegrations("research-cohort")).toBe(false);
    expect(shouldEnableOwnerShellIntegrations("owner-app")).toBe(true);
  });

  it("permits the research account route while keeping unrelated routes closed", () => {
    expect(isResearchCohortPathAllowed("/research/account")).toBe(true);
    expect(isResearchCohortPathAllowed("/api/account/delete")).toBe(true);
    expect(isResearchCohortPathAllowed("/sw.js")).toBe(true);
    expect(isResearchCohortPathAllowed("/settings")).toBe(false);
  });

  it("keeps product-owner access separate from cohort invitations", () => {
    const person = { id: "user-1", email: "owner@example.com" };
    expect(isResearchParticipantAllowed(person, { allowlist: "owner@example.com", authDisabled: "false" })).toBe(true);
    expect(isResearchOperatorAllowed(person, { allowlist: "operator@example.com", authDisabled: "false" })).toBe(false);
    expect(isResearchOperatorAllowed(person, { allowlist: "OWNER@example.com", authDisabled: "false" })).toBe(true);
  });
});
