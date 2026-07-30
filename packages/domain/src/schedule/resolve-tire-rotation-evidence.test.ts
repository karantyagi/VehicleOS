import { describe, expect, it } from "vitest";
import type { ServiceTimelineEntry } from "../projections/types.js";
import { resolveTireRotationEvidence } from "./resolve-tire-rotation-evidence.js";

const entry = (
  serviceId: string,
  serviceDate: string,
  mileage: number,
  lineItems: string[],
): ServiceTimelineEntry => ({
  serviceId,
  shop: "Costco Tire Center",
  serviceDate,
  mileage,
  lineItems,
  total: "$0.00",
  evidenceIds: [],
});

describe("resolveTireRotationEvidence", () => {
  it("uses the current tire installation as the lifecycle baseline", () => {
    const previousRotation = entry(
      "old-rotation",
      "2024-08-01",
      37_883,
      ["Tires rotated"],
    );
    const installation = entry(
      "installation",
      "2025-01-06",
      39_390,
      ["Four tires replaced"],
    );
    const rotations = [
      previousRotation,
      entry("rotation-1", "2025-07-01", 45_243, ["Tires rotated"]),
      entry("rotation-2", "2026-01-20", 53_225, ["Tires rotated"]),
      entry("rotation-3", "2026-07-15", 58_819, ["Tires rotated"]),
    ];

    const result = resolveTireRotationEvidence({
      timeline: [installation, ...rotations],
      rotationMatches: rotations,
    });

    expect(result.scope).toBe("current_tire_set");
    expect(result.currentTireInstallation?.serviceId).toBe("installation");
    expect(result.rotationEvents.map((item) => item.serviceId)).toEqual([
      "rotation-1",
      "rotation-2",
      "rotation-3",
    ]);
    expect(result.recentGapsMiles).toEqual([5_853, 7_982, 5_594]);
    expect(result.recentAverageMiles).toBe(6_476);
    expect(result.recentMedianMiles).toBe(5_853);
    expect(result.lastLifecycleMileage).toBe(58_819);
  });

  it("falls back to rotation-only vehicle history when installation is unknown", () => {
    const rotations = [
      entry("rotation-1", "2024-01-01", 10_000, ["Tires rotated"]),
      entry("rotation-2", "2024-07-01", 16_000, ["Tires rotated"]),
      entry("rotation-3", "2025-01-01", 22_000, ["Tires rotated"]),
    ];

    const result = resolveTireRotationEvidence({
      timeline: rotations,
      rotationMatches: rotations,
    });

    expect(result.scope).toBe("vehicle_history");
    expect(result.currentTireInstallation).toBeNull();
    expect(result.recentGapsMiles).toEqual([6_000, 6_000]);
    expect(result.recentAverageMiles).toBe(6_000);
    expect(result.recentMedianMiles).toBe(6_000);
  });

  it("resets evidence after a newer tire replacement", () => {
    const oldInstallation = entry(
      "old-installation",
      "2024-01-01",
      10_000,
      ["Four tires installed"],
    );
    const oldRotation = entry(
      "old-rotation",
      "2024-07-01",
      16_000,
      ["Tires rotated"],
    );
    const newInstallation = entry(
      "new-installation",
      "2025-01-01",
      24_000,
      ["Tires purchased"],
    );
    const newRotation = entry(
      "new-rotation",
      "2025-07-01",
      30_500,
      ["Tires rotated"],
    );

    const result = resolveTireRotationEvidence({
      timeline: [oldInstallation, oldRotation, newInstallation, newRotation],
      rotationMatches: [oldRotation, newRotation],
    });

    expect(result.currentTireInstallation?.serviceId).toBe("new-installation");
    expect(result.rotationEvents.map((item) => item.serviceId)).toEqual([
      "new-rotation",
    ]);
    expect(result.recentGapsMiles).toEqual([6_500]);
  });
});
