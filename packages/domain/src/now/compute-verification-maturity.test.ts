import { describe, expect, it } from "vitest";
import { EVENT_TYPES, EVENT_VERSIONS } from "../events/catalog.js";
import type { CatalogDomainEvent } from "../events/catalog.js";
import { computeVerificationMaturity } from "./compute-verification-maturity.js";

const vehicleId = "veh-1";

const verificationCreated = (input: {
  taskId: string;
  createdAt: string;
}): CatalogDomainEvent => ({
  id: input.taskId,
  aggregateType: "task",
  aggregateId: input.taskId,
  eventType: EVENT_TYPES.TASK_CREATED,
  eventVersion: EVENT_VERSIONS[EVENT_TYPES.TASK_CREATED],
  createdAt: input.createdAt,
  payload: {
    vehicleId,
    taskId: input.taskId,
    recommendationId: "rec-1",
    title: "Verify odometer reading",
    reason: "Mileage conflict",
    status: "pending",
    taskKind: "verification",
    verificationCode: "VERIFY_ODOMETER",
  },
});

describe("computeVerificationMaturity", () => {
  it("counts verification tasks per calendar week", () => {
    const result = computeVerificationMaturity({
      vehicleId,
      today: "2026-07-23",
      events: [
        verificationCreated({ taskId: "t1", createdAt: "2026-07-22T10:00:00.000Z" }),
        verificationCreated({ taskId: "t2", createdAt: "2026-07-21T10:00:00.000Z" }),
        verificationCreated({ taskId: "t3", createdAt: "2026-07-14T10:00:00.000Z" }),
      ],
    });

    expect(result.thisWeekCount).toBe(2);
    expect(result.lastWeekCount).toBe(1);
    expect(result.weekOverWeekDelta).toBe(1);
    expect(result.weeklyCounts.at(-1)?.count).toBe(2);
  });

  it("builds expected curve from first verification week", () => {
    const result = computeVerificationMaturity({
      vehicleId,
      today: "2026-07-23",
      windowWeeks: 4,
      events: [verificationCreated({ taskId: "t1", createdAt: "2026-07-01T10:00:00.000Z" })],
    });

    expect(result.expectedCurve[0]?.count).toBeGreaterThan(result.expectedCurve.at(-1)?.count ?? 0);
    expect(result.maturityStage).toBe("onboarding");
  });

  it("celebrates downward trend when recent average drops", () => {
    const events: CatalogDomainEvent[] = [];
    for (let week = 0; week < 8; week += 1) {
      const createdAt = new Date(Date.UTC(2026, 5, 2 + week * 7, 12, 0, 0)).toISOString();
      const count = week < 4 ? 6 : 1;
      for (let index = 0; index < count; index += 1) {
        events.push(
          verificationCreated({
            taskId: `w${week}-${index}`,
            createdAt,
          }),
        );
      }
    }

    const result = computeVerificationMaturity({
      vehicleId,
      today: "2026-07-23",
      events,
    });

    expect(result.hasEnoughRealData).toBe(true);
    expect(result.celebrateTrend).toBe(true);
    expect(result.maturityStage).toBe("steady");
  });
});
