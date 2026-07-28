import { describe, expect, it } from "vitest";
import type { AppendDomainEventInput, DomainEventEnvelope } from "../events/types.js";
import type { EventStore } from "../ports/event-store.js";
import { recordImportRowVerification } from "./record-import-row-verification.js";
import type { TieredImportRow } from "./tier-import-rows.js";

const asEnvelope = (event: AppendDomainEventInput, index = 0): DomainEventEnvelope => ({
  ...event,
  id: `event-${index + 1}`,
  createdAt: "2026-07-28T00:00:00.000Z",
});

const eventStore = (onAppend?: (event: AppendDomainEventInput) => void): EventStore => ({
  append: async (event) => {
    onAppend?.(event);
    return asEnvelope(event);
  },
  appendMany: async (events) => events.map(asEnvelope),
  loadByAggregate: async () => [],
  loadAll: async () => [],
});

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
    total: "$0.00",
  },
  ...overrides,
});

describe("recordImportRowVerification", () => {
  it("returns null task when no verify rows", async () => {
    const result = await recordImportRowVerification({
      eventStore: eventStore(),
      input: {
        vehicleId: "veh-1",
        importSource: "carfax-json",
        rows: [
          {
            index: 0,
            tier: "auto",
            reasons: [],
            ownerGuidance: [],
            service: {
              shop: "Costco Tire Center",
              shopLocation: "Waltham, MA",
              serviceDate: "2025-06-01",
              mileage: 50000,
              lineItems: ["Tires rotated"],
              total: "$0.00",
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
      eventStore: eventStore((event) => appended.push(event)),
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
