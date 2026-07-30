import { describe, expect, it } from "vitest";
import {
  INSPECTION_RENEWAL_RULE_ID,
  REGISTRATION_RENEWAL_GENERIC_RULE_ID,
  REGISTRATION_RENEWAL_MA_RULE_ID,
  isRenewalRuleId,
  resolveRenewalRuleId,
} from "./resolve-renewal-rule-id.js";

describe("resolveRenewalRuleId", () => {
  it("maps Massachusetts registration to catalog rule id", () => {
    expect(
      resolveRenewalRuleId({
        eventType: "registration",
        agency: "Massachusetts RMV (myRMV)",
      }),
    ).toBe(REGISTRATION_RENEWAL_MA_RULE_ID);
  });

  it("maps non-MA registration to generic renewal rule id", () => {
    expect(
      resolveRenewalRuleId({
        eventType: "registration",
        agency: "California DMV",
      }),
    ).toBe(REGISTRATION_RENEWAL_GENERIC_RULE_ID);
  });

  it("maps inspection renewals", () => {
    expect(resolveRenewalRuleId({ eventType: "inspection" })).toBe(INSPECTION_RENEWAL_RULE_ID);
  });

  it("recognizes both renewal rule id families", () => {
    expect(isRenewalRuleId(REGISTRATION_RENEWAL_MA_RULE_ID)).toBe(true);
    expect(isRenewalRuleId("renewal.policy.registration.v1")).toBe(true);
    expect(isRenewalRuleId("knowledge.policy.code-b.v1")).toBe(false);
  });
});
