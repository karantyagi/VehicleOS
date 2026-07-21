import { describe, expect, it } from "vitest";
import { InMemoryEventStore, StubPolicyEngine } from "../index.js";
import { refreshMaintenanceRecommendation } from "./refresh-maintenance-recommendation.js";

describe("refreshMaintenanceRecommendation", () => {
  it("opens a pending Now task when policy says maintenance is due", async () => {
    const eventStore = new InMemoryEventStore();
    const vehicleId = crypto.randomUUID();

    await eventStore.append({
      aggregateType: "vehicle",
      aggregateId: vehicleId,
      eventType: "service.recorded",
      eventVersion: 1,
      payload: {
        vehicleId,
        serviceId: "svc-1",
        shop: "Quick Lube",
        serviceDate: "2025-06-01",
        mileage: 10_000,
        lineItems: ["Oil change"],
        total: "$45",
        evidenceIds: [],
        source: "receipt",
      },
    });

    await eventStore.append({
      aggregateType: "vehicle",
      aggregateId: vehicleId,
      eventType: "service.recorded",
      eventVersion: 1,
      payload: {
        vehicleId,
        serviceId: "svc-2",
        shop: "Owner noted",
        serviceDate: "2026-01-01",
        mileage: 16_000,
        lineItems: ["Drove a lot"],
        total: "$0.00",
        evidenceIds: [],
        source: "owner_note",
      },
    });

    const result = await refreshMaintenanceRecommendation({
      eventStore,
      policyEngine: new StubPolicyEngine(),
      vehicleId,
    });

    expect(result.created).toBe(true);
    expect(result.recommendation?.ruleId).toMatch(/^schedule\.policy\./);
    expect(result.nowQueue.some((item) => item.status === "pending")).toBe(true);
  });

  it("skips when the same rule is already pending", async () => {
    const eventStore = new InMemoryEventStore();
    const vehicleId = crypto.randomUUID();
    const ruleId = "schedule.policy.oil_change.v1";

    await eventStore.append({
      aggregateType: "task",
      aggregateId: "task-1",
      eventType: "task.created",
      eventVersion: 1,
      payload: {
        vehicleId,
        taskId: "task-1",
        recommendationId: "rec-1",
        title: "Oil change due",
        reason: "Due now",
        status: "pending",
        taskKind: "recommendation",
        ruleId,
      },
    });

    const result = await refreshMaintenanceRecommendation({
      eventStore,
      policyEngine: {
        evaluate: () => ({
          recommendationId: crypto.randomUUID(),
          title: "Oil change due",
          reason: "Due now",
          confidence: 0.9,
          evidenceIds: [],
          ruleId,
        }),
      },
      vehicleId,
    });

    expect(result.created).toBe(false);
    expect(result.skippedReason).toBe("already_pending");
  });
});
