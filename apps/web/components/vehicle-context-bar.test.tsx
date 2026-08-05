import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { VehicleContextBar } from "./vehicle-context-bar";

const setActiveSection = vi.fn();

vi.mock("@/components/vehicle-garage-switcher", () => ({
  VehicleGarageSwitcher: () => <div>Vehicle switcher</div>,
}));

vi.mock("@/lib/garage/garage-context", () => ({
  useGarageOptional: () => ({
    isLoading: false,
    vehicles: [{ id: "vehicle-1" }],
    switchLock: { locked: false, reason: null },
  }),
}));

vi.mock("@/lib/vehicle-console-context", () => ({
  useVehicleConsoleOptional: () => ({
    snapshot: {
      label: "2021 Acura TLX",
      mileage: 56_221,
      pendingReminderCount: 1,
      pendingVerificationCount: 3,
      lastServiceDate: null,
      lastServiceShop: null,
      pipelinePhase: "idle",
      pipelineLabel: "Up to date",
    },
  }),
}));

vi.mock("@/lib/store/app-ui-store", () => ({
  useAppUiStore: (selector: (state: {
    consoleMode: "owner";
    density: "comfortable";
    toggleDensity: () => void;
    setActiveSection: typeof setActiveSection;
  }) => unknown) =>
    selector({
      consoleMode: "owner",
      density: "comfortable",
      toggleDensity: () => undefined,
      setActiveSection,
    }),
}));

describe("VehicleContextBar", () => {
  it("renders owner attention and verification counts as accessible buttons", () => {
    const markup = renderToStaticMarkup(<VehicleContextBar />);

    expect(markup).toContain('aria-label="Open 1 car action in your attention"');
    expect(markup).toContain('aria-label="Open 3 assistant questions in your attention"');
    expect(markup).toContain("1 car action");
    expect(markup).toContain("3 questions");
    expect((markup.match(/<button/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
