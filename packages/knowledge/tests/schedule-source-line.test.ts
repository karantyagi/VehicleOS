import { describe, expect, it } from "vitest";
import {
  formatScheduleSourceLine,
  formatScheduleSourceVehicleLabel,
  shouldDiscloseScheduleSource,
} from "../src/schedule-source-line.js";

describe("formatScheduleSourceLine", () => {
  it("returns null for exact same vehicle", () => {
    const vehicle = {
      year: 2021,
      make: "Acura",
      model: "TLX",
      trim: "SH-AWD",
      powertrain: "SH-AWD",
    };

    expect(formatScheduleSourceLine(vehicle, vehicle)).toBeNull();
  });

  it("returns same-year shared trim line", () => {
    expect(
      formatScheduleSourceLine(
        { year: 2022, make: "Acura", model: "TLX", trim: "SH-AWD", powertrain: "SH-AWD" },
        { year: 2022, make: "Acura", model: "TLX", trim: "Base" },
      ),
    ).toBe("Schedule from the 2022 Acura TLX Base manual — same OEM intervals for your car.");
  });

  it("returns adjacent-year line", () => {
    expect(
      formatScheduleSourceLine(
        { year: 2023, make: "BMW", model: "i4", trim: "eDrive35" },
        { year: 2024, make: "BMW", model: "i4", trim: "eDrive35" },
      ),
    ).toBe(
      "Schedule from the 2024 BMW i4 eDrive35 manual — closest verified OEM year for your 2023 i4.",
    );
  });

  it("formats manual label with powertrain when distinct from trim", () => {
    expect(
      formatScheduleSourceVehicleLabel({
        year: 2022,
        make: "Acura",
        model: "TLX",
        trim: "SH-AWD",
        powertrain: "SH-AWD",
      }),
    ).toBe("2022 Acura TLX SH-AWD");
  });
});

describe("shouldDiscloseScheduleSource", () => {
  it("requires manual share with shared pack id", () => {
    expect(shouldDiscloseScheduleSource({ manualShareApplied: true, sharedFromPackId: "x" })).toBe(
      true,
    );
    expect(shouldDiscloseScheduleSource({ manualShareApplied: false, sharedFromPackId: "x" })).toBe(
      false,
    );
    expect(shouldDiscloseScheduleSource({ manualShareApplied: true, sharedFromPackId: "" })).toBe(
      false,
    );
  });
});
