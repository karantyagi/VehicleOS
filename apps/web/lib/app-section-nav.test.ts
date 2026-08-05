import { describe, expect, it, vi } from "vitest";
import {
  dashboardSectionHref,
  navigateToAppSection,
  parseDashboardSection,
} from "./app-section-nav";
import { isSectionVisibleInMode } from "./console-mode";

describe("dashboard section navigation", () => {
  it("builds and parses the permanent owner-attention route", () => {
    expect(dashboardSectionHref("attention")).toBe("/?section=attention");
    expect(parseDashboardSection("?section=attention")).toBe("attention");
  });

  it("rejects unknown section values", () => {
    expect(parseDashboardSection("?section=unknown")).toBeNull();
  });

  it("keeps Your attention available in owner mode", () => {
    expect(isSectionVisibleInMode("attention", "owner")).toBe(true);
  });

  it("uses the dashboard route when navigation begins outside the dashboard", () => {
    const push = vi.fn();
    const setActiveSection = vi.fn();

    navigateToAppSection({
      pathname: "/garage",
      section: "attention",
      router: { push },
      setActiveSection,
    });

    expect(push).toHaveBeenCalledWith("/?section=attention");
    expect(setActiveSection).not.toHaveBeenCalled();
  });
});
