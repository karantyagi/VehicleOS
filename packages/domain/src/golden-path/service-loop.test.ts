import { describe, expect, it } from "vitest";
import {
  EVENT_TYPES,
  GOLDEN_PATH_FLOW,
  InMemoryEventStore,
  ReceiptUploadAdapter,
  StubPolicyEngine,
  decideTask,
  foldEvents,
  recordServiceAndRecommend,
} from "../index.js";

describe("golden path flow catalog", () => {
  it("declares the vertical slice event order", () => {
    expect(GOLDEN_PATH_FLOW).toEqual([
      EVENT_TYPES.DOCUMENT_INGESTED,
      EVENT_TYPES.DOCUMENT_EXTRACTION_COMPLETED,
      EVENT_TYPES.SERVICE_RECORDED,
      EVENT_TYPES.MAINTENANCE_RECOMMENDATION_CREATED,
      EVENT_TYPES.TASK_CREATED,
    ]);
  });
});

describe("recordServiceAndRecommend", () => {
  it("records service, projects timeline, and creates a Now queue task", async () => {
    const eventStore = new InMemoryEventStore();
    const policyEngine = new StubPolicyEngine();
    const vehicleId = crypto.randomUUID();

    const result = await recordServiceAndRecommend({
      eventStore,
      policyEngine,
      input: {
        vehicleId,
        shop: "Jiffy Lube",
        serviceDate: "2026-01-12",
        mileage: 41_800,
        lineItems: ["Oil change (synthetic)"],
        total: "$67.42",
        evidenceIds: ["evidence-1"],
      },
    });

    expect(result.state.timeline).toHaveLength(1);
    expect(result.state.currentMileage).toBe(41_800);
    expect(result.recommendation).not.toBeNull();
    expect(result.task?.status).toBe("pending");
    expect(result.state.nowQueue).toHaveLength(1);
  });

  it("recommends oil change when interval exceeded", async () => {
    const eventStore = new InMemoryEventStore();
    const policyEngine = new StubPolicyEngine();
    const vehicleId = crypto.randomUUID();

    await recordServiceAndRecommend({
      eventStore,
      policyEngine,
      input: {
        vehicleId,
        shop: "Jiffy Lube",
        serviceDate: "2025-06-01",
        mileage: 30_000,
        lineItems: ["Oil change (synthetic)"],
        total: "$60.00",
        evidenceIds: ["evidence-old"],
      },
    });

    const result = await recordServiceAndRecommend({
      eventStore,
      policyEngine,
      input: {
        vehicleId,
        shop: "Town Fair Tire",
        serviceDate: "2026-01-12",
        mileage: 36_500,
        lineItems: ["Tire rotation"],
        total: "$45.00",
        evidenceIds: ["evidence-new"],
      },
    });

    expect(result.recommendation?.title).toBe("Oil change due");
    expect(result.recommendation?.ruleId).toBe("schedule.policy.oil_change.v1");
  });
});

describe("decideTask", () => {
  it("updates queue status when task is approved", async () => {
    const eventStore = new InMemoryEventStore();
    const policyEngine = new StubPolicyEngine();
    const vehicleId = crypto.randomUUID();

    const { task, state: initialState } = await recordServiceAndRecommend({
      eventStore,
      policyEngine,
      input: {
        vehicleId,
        shop: "Jiffy Lube",
        serviceDate: "2026-01-12",
        mileage: 41_800,
        lineItems: ["Inspection"],
        total: "$0.00",
        evidenceIds: ["evidence-1"],
      },
    });

    expect(task).not.toBeNull();

    await decideTask({
      eventStore,
      vehicleId,
      taskId: task!.taskId,
      decision: "approve",
    });

    const events = (await eventStore.loadAll()).filter(
      (event) => "vehicleId" in event.payload && event.payload.vehicleId === vehicleId,
    );
    const finalState = foldEvents(vehicleId, events);

    expect(initialState.nowQueue[0]?.status).toBe("pending");
    expect(finalState.nowQueue[0]?.status).toBe("approved");
  });
});

describe("ReceiptUploadAdapter", () => {
  it("normalizes receipt upload captures", () => {
    const adapter = new ReceiptUploadAdapter();
    const capture = adapter.normalize({
      vehicleId: "vehicle-1",
      storageKey: "receipts/abc.pdf",
    });

    expect(capture.channel).toBe("receipt_upload");
    expect(capture.vehicleId).toBe("vehicle-1");
    expect(capture.storageKey).toBe("receipts/abc.pdf");
    expect(capture.documentId).toBeTruthy();
  });
});
