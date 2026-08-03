import { describe, expect, it } from "vitest";
import { researchDraftLimit, researchQuotaSubject } from "./quota.js";

describe("research participant quota", () => {
  it("defaults the pilot to five successful drafts and bounds configuration", () => {
    expect(researchDraftLimit("")).toBe(5);
    expect(researchDraftLimit("7")).toBe(7);
    expect(researchDraftLimit("0")).toBe(5);
    expect(researchDraftLimit("11")).toBe(5);
  });

  it("uses a stable, secret-bound subject token instead of an email", () => {
    expect(researchQuotaSubject("Friend@Example.com", "test-secret")).toBe(researchQuotaSubject("friend@example.com", "test-secret"));
    expect(researchQuotaSubject("friend@example.com", "test-secret")).not.toBe(researchQuotaSubject("friend@example.com", "other-secret"));
    expect(researchQuotaSubject(null, "test-secret")).toBeNull();
    expect(researchQuotaSubject("friend@example.com", "")).toBeNull();
  });
});
