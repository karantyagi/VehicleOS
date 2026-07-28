import { describe, expect, it } from "vitest";
import {
  crossDayMileageRegressionByIndex,
  shouldFlagCrossDayMileageRegression,
} from "./cross-day-mileage-regression.js";
import type { VehicleOsImportService } from "./record-vehicleos-import.js";

const row = (overrides: Partial<VehicleOsImportService>): VehicleOsImportService => ({
  shop: "MetroWest Acura",
  shopLocation: "Framingham, MA",
  serviceDate: "2025-06-11",
  mileage: 44_567,
  lineItems: ["Oil changed"],
  total: "$0.00",
  ...overrides,
});

describe("shouldFlagCrossDayMileageRegression", () => {
  it("ignores small same-period noise under 1%", () => {
    expect(shouldFlagCrossDayMileageRegression(42_000, 42_095)).toBe(false);
  });

  it("flags large cross-day rollback", () => {
    expect(shouldFlagCrossDayMileageRegression(49_000, 50_000)).toBe(true);
  });
});

describe("crossDayMileageRegressionByIndex", () => {
  it("does not flag same-day mileage differences", () => {
    const services = [
      row({ serviceDate: "2025-06-11", mileage: 44_590 }),
      row({ serviceDate: "2025-06-11", mileage: 44_567 }),
    ];

    expect(crossDayMileageRegressionByIndex(services).size).toBe(0);
  });

  it("flags meaningful cross-day rollback", () => {
    const services = [
      row({ serviceDate: "2026-01-01", mileage: 50_000 }),
      row({ serviceDate: "2026-06-01", mileage: 49_000 }),
    ];

    const regressions = crossDayMileageRegressionByIndex(services);
    expect(regressions.get(1)).toBe(50_000);
  });
});
