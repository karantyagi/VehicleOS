import { describe, expect, it } from "vitest";
import { recordImportRowVerification } from "./record-import-row-verification.js";
import type { TieredImportRow } from "./tier-import-rows.js";

const verifyRow = (overrides: Partial<TieredImportRow> = {}): TieredImportRow => ({
  index: 0,
  tier: "verify",
  reasons: ["Shop city not filled in yet"],
  ownerGuidance: [
    {
      code: "missing_shop_location",
      title: "Shop city not filled in yet",
      detail: "We could not confidently place Unknown Shop on the map from your saved shops or geocoding.",
      resolve:
        "Pick a suggested city below, type City, ST once, or uncheck if you do not want this visit. We remember confirmed shops for your next import.",
    },
  ],
  service: {
    shop: "Unknown Shop",
    serviceDate: "2025-06-01",
    mileage: 50000,
    lineItems: ["Inspection"],
  },
  ...overrides,
});

describe("recordImportRowVerification", () => {
  it("returns null task when no verify rows", async () => {
    const result = await recordImportRowVerification({
      eventStore: { append: async () => undefined },
      input: {
        vehicleId: "veh-1",
        importSource: "carfax-json",
        rows: [
          {
            index: 0,
            tier: "auto",
            reasons: [],
            service: {
              shop: "Costco Tire Center",
              shopLocation: "Waltham, MA",
              serviceDate: "2025-06-01",
              mileage: 50000,
              lineItems: ["Tires rotated"],
            },
          },
        ],
      },
    });

    expect(result.taskId).toBeNull();
  });

  it("creates verification task for verify-tier rows", async () => {
    const appended: unknown[] = [];
    const result = await recordImportRowVerification({
      eventStore: {
        append: async (event) => {
          appended.push(event);
        },
      },
      input: {
        vehicleId: "veh-1",
        importSource: "carfax-json",
        rows: [verifyRow()],
      },
    });

    expect(result.taskId).toBeTruthy();
    expect(appended).toHaveLength(1);
    const event = appended[0] as { payload: { verificationCode: string; taskKind: string } };
    expect(event.payload.verificationCode).toBe("VERIFY_IMPORT_ROW");
    expect(event.payload.taskKind).toBe("verification");
  });
});
