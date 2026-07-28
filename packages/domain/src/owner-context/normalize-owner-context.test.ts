import { describe, expect, it } from "vitest";
import { normalizeOwnerContextMemory } from "./normalize-owner-context.js";

describe("normalizeOwnerContextMemory", () => {
  it("keeps supported tire rotation conditions and drops unknown values", () => {
    const normalized = normalizeOwnerContextMemory({
      intervalOverlays: {
        "mm-sub-1": {
          intervalMiles: 6_000,
          intervalMonths: null,
          basis: "mileage",
          tireRotationConditions: [
            "uneven_tread",
            "pressure_or_tpms",
            "not_supported",
            "uneven_tread",
          ],
          label: "Every 6,000 mi",
          confirmedAt: "2026-07-28T00:00:00.000Z",
        },
      },
    });

    expect(normalized.intervalOverlays?.["mm-sub-1"]).toEqual({
      intervalMiles: 6_000,
      intervalMonths: null,
      basis: "mileage",
      tireRotationConditions: ["uneven_tread", "pressure_or_tpms"],
      label: "Every 6,000 mi",
      confirmedAt: "2026-07-28T00:00:00.000Z",
    });
  });
});
