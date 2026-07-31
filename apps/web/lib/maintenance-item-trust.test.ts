import { describe, expect, it } from "vitest";
import type { TimelineEntry } from "@/lib/console-types";
import {
  buildMaintenanceCorrectionDraft,
  buildMaintenanceRecordDraft,
  maintenancePatchFromDraft,
} from "./maintenance-item-trust";

const baseline: TimelineEntry = {
  serviceId: "service-rotation-latest",
  shop: "Costco Tire Center",
  shopLocation: "Waltham, MA",
  serviceDate: "2026-07-15",
  mileage: 58_819,
  lineItems: ["Tires rotated", "Pressure checked"],
  total: "$0.00",
  evidenceIds: ["carfax-rotation-latest"],
  source: "carfax_import",
};

describe("maintenance item trust actions", () => {
  it("prefills a completion record with the exact maintenance item", () => {
    expect(buildMaintenanceRecordDraft(59_100, "Rotate tires")).toMatchObject({
      mileage: "59100",
      lineItems: "Rotate tires",
      captureChannel: "manual",
    });
  });

  it("preserves the full visit when correcting the matched baseline", () => {
    const draft = buildMaintenanceCorrectionDraft(baseline);
    expect(draft.lineItems).toBe("Tires rotated\nPressure checked");
    expect(maintenancePatchFromDraft(draft)).toMatchObject({
      shop: "Costco Tire Center",
      mileage: 58_819,
      lineItems: ["Tires rotated", "Pressure checked"],
    });
  });
});
