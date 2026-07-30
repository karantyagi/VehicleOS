import { describe, expect, it } from "vitest";
import {
  removeIntervalOverlayMemory,
  resolveIntervalForEntry,
} from "./merge-interval-overlay-memory.js";

describe("resolveIntervalForEntry", () => {
  it("uses owner overlay miles when confirmed", () => {
    const resolved = resolveIntervalForEntry({
      entryId: "fuel-system",
      oemIntervalMonths: 12,
      oemIntervalMiles: 10_000,
      ownerContextMemory: {
        intervalOverlays: {
          "fuel-system": {
            intervalMiles: 3_000,
            label: "Techron every 3k mi",
            confirmedAt: "2026-07-27T00:00:00.000Z",
          },
        },
      },
    });

    expect(resolved.usesOwnerOverlay).toBe(true);
    expect(resolved.intervalMiles).toBe(3_000);
    expect(resolved.overlayLabel).toBe("Techron every 3k mi");
  });

  it("uses mileage only for a confirmed tire rotation interval", () => {
    const resolved = resolveIntervalForEntry({
      entryId: "mm-sub-1",
      oemIntervalMonths: 12,
      oemIntervalMiles: 7_500,
      ownerContextMemory: {
        intervalOverlays: {
          "mm-sub-1": {
            intervalMiles: 6_000,
            intervalMonths: null,
            basis: "mileage",
            tireRotationConditions: ["uneven_tread"],
            label: "Every 6,000 mi",
            confirmedAt: "2026-07-28T00:00:00.000Z",
          },
        },
      },
    });

    expect(resolved.intervalMiles).toBe(6_000);
    expect(resolved.intervalMonths).toBeNull();
  });

  it("restores the OEM rule without removing other owner context", () => {
    const memory = removeIntervalOverlayMemory({
      memory: {
        primaryCity: "Waltham",
        intervalOverlays: {
          "mm-sub-1": {
            basis: "mileage",
            intervalMiles: 6_000,
            intervalMonths: null,
            label: "Every 6,000 mi",
            confirmedAt: "2026-07-30T12:00:00.000Z",
          },
        },
      },
      entryId: "mm-sub-1",
    });

    expect(memory).toEqual({
      primaryCity: "Waltham",
      intervalOverlays: undefined,
    });
  });
});
