import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DriverHabitsPanel } from "./driver-habits-panel";
import { VehicleSettingsPanel } from "./vehicle-settings-panel";
import type { GarageVehicleSummary } from "@/lib/garage/types";

vi.mock("@/components/date-field", () => ({
  DateField: () => <input type="date" />,
}));

const vehicle: GarageVehicleSummary = {
  id: "vehicle-tlx",
  year: 2021,
  make: "Acura",
  model: "TLX",
  trim: "Technology SH-AWD",
  currentMileage: 56_221,
  vin: "19UUB6F55MA000123",
  ownedSince: "2021-08-14",
  drivingStyle: "casual",
  statedMilesPerYear: 10_000,
  ownerContextMemory: {
    primaryCity: "Boston",
    primaryCityUpdatedAt: "2026-08-03",
  },
};

describe("profile panels", () => {
  it("shows the saved vehicle profile before exposing editable fields", () => {
    const markup = renderToStaticMarkup(<VehicleSettingsPanel vehicle={vehicle} minimal />);

    expect(markup).toContain("2021 Acura TLX Technology SH-AWD");
    expect(markup).toContain("56,221 mi");
    expect(markup).toContain("Ending 0123");
    expect(markup).toContain("Edit vehicle");
    expect(markup).not.toContain('id="vehicle-year"');
  });

  it("shows the saved driving profile before exposing default form choices", () => {
    const markup = renderToStaticMarkup(<DriverHabitsPanel vehicle={vehicle} minimal />);

    expect(markup).toContain("Boston");
    expect(markup).toContain("10,000 mi/year");
    expect(markup).toContain("Edit driving profile");
    expect(markup).not.toContain('id="driving-style-casual"');
  });
});
