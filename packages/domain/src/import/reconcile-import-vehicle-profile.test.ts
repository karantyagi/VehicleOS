import { describe, expect, it } from "vitest";
import {
  isPlaceholderVin,
  reconcileImportVehicleProfile,
} from "./reconcile-import-vehicle-profile.js";

const savedProfile = {
  vin: "DEMO-VIN-001",
  year: 2021,
  make: "Acura",
  model: "TLX",
};

describe("reconcileImportVehicleProfile", () => {
  it("fills VIN and identity when saved VIN is a placeholder", () => {
    const result = reconcileImportVehicleProfile(savedProfile, {
      vin: "19UUB3F58MA008123",
      year: 2021,
      make: "Acura",
      model: "TLX",
    });

    expect(result.conflicts).toHaveLength(0);
    expect(result.patch).toEqual({
      vin: "19UUB3F58MA008123",
      year: 2021,
      make: "Acura",
      model: "TLX",
    });
  });

  it("flags VIN conflict when saved VIN differs from import", () => {
    const result = reconcileImportVehicleProfile(
      { ...savedProfile, vin: "19UUB3F58MA008999" },
      { vin: "19UUB3F58MA008123" },
    );

    expect(result.patch).toEqual({});
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.field).toBe("vin");
  });

  it("flags make conflict when identity is already saved", () => {
    const result = reconcileImportVehicleProfile(
      { ...savedProfile, vin: "19UUB3F58MA008123" },
      { vin: "19UUB3F58MA008123", make: "Honda" },
    );

    expect(result.conflicts.some((conflict) => conflict.field === "make")).toBe(true);
  });
});

describe("isPlaceholderVin", () => {
  it("treats demo and empty VIN as placeholder", () => {
    expect(isPlaceholderVin("")).toBe(true);
    expect(isPlaceholderVin("DEMO-VIN-001")).toBe(true);
    expect(isPlaceholderVin("19UUB3F58MA008123")).toBe(false);
  });
});
