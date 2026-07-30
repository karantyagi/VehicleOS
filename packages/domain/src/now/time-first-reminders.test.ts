import { describe, expect, it } from "vitest";
import {
  formatOwnerDeadline,
  resolveAttentionWindow,
} from "./format-owner-deadline.js";
import {
  buildOwnerReminderViews,
  buildOwnerVerificationViews,
} from "./build-owner-reminders.js";
import type { NowQueueItem } from "../projections/types.js";
import type { ServiceTimelineEntry } from "../projections/types.js";
import { projectMaintenanceSchedule } from "../schedule/project-maintenance-schedule.js";
import { EVENT_TYPES, type CatalogDomainEvent } from "../events/catalog.js";

describe("formatOwnerDeadline", () => {
  it("uses calendar language not mileage", () => {
    expect(formatOwnerDeadline("2026-07-30", "2026-07-24")).toBe("By end of this week");
    expect(formatOwnerDeadline("2026-07-20", "2026-07-24")).toBe("Overdue — act now");
  });
});

describe("resolveAttentionWindow", () => {
  it("separates the owner planning horizons", () => {
    expect(resolveAttentionWindow("2026-07-23", "2026-07-24")).toBe("overdue");
    expect(resolveAttentionWindow("2026-07-30", "2026-07-24")).toBe("this_week");
    expect(resolveAttentionWindow("2026-08-05", "2026-07-24")).toBe("next_week");
    expect(resolveAttentionWindow("2026-08-18", "2026-07-24")).toBe("this_month");
    expect(resolveAttentionWindow("2026-09-30", "2026-07-24")).toBe("later");
  });
});

describe("buildOwnerReminderViews", () => {
  const baseItem: NowQueueItem = {
    taskId: "task-1",
    recommendationId: "rec-1",
    title: "Oil change",
    reason: "Assistant projected this from OEM intervals and recent service.",
    status: "pending",
    taskKind: "recommendation",
    ruleId: "schedule.policy.oil_change.v1",
    dueBy: "2026-07-30",
  };

  it("hides stale knowledge reminders when CARFAX oil baseline is within interval", () => {
    const timelineRow = (overrides: Partial<ServiceTimelineEntry>): ServiceTimelineEntry => ({
      serviceId: "svc-1",
      shop: "Dealer",
      serviceDate: "2026-05-13",
      mileage: 57_160,
      lineItems: ["Oil and filter changed"],
      total: "$0.00",
      evidenceIds: [],
      source: "carfax_import",
      ...overrides,
    });

    const scheduleRows = projectMaintenanceSchedule({
      knowledgeSchedule: [
        {
          entryId: "code-b",
          serviceName: "Replace engine oil and filter (Maintenance Minder B)",
          intervalMonths: 12,
          intervalMiles: 7_500,
          sourceDocumentId: "doc-1",
          manualTitle: "Owner manual",
          sourcePage: "P. 527 — Code B",
          recordedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      timeline: [
        timelineRow({
          lineItems: ["Vehicle serviced", "Maintenance inspection completed", "Oil and filter changed"],
        }),
      ],
      currentMileage: 58_819,
      today: "2026-07-25",
      horizonMode: "extended",
    }).rows;

    const views = buildOwnerReminderViews({
      items: [
        {
          taskId: "task-oil",
          recommendationId: "rec-1",
          title: "Replace engine oil and filter (Maintenance Minder B) due",
          reason:
            "OEM schedule (P. 527 — Code B): every 7,500 mi. 59,024 miles since last recorded replace engine oil and filter (maintenance minder b).",
          status: "pending",
          taskKind: "recommendation",
          ruleId: "knowledge.policy.code-b.v1",
        },
      ],
      scheduleRows,
      today: "2026-07-25",
    });

    expect(scheduleRows[0]?.status).toBe("upcoming");
    expect(views).toHaveLength(0);
  });
});

describe("owner verification presentation", () => {
  it("classifies blocking conflicts separately from advisory prompts", () => {
    const views = buildOwnerVerificationViews([
      {
        taskId: "verify-date",
        recommendationId: "conflict-1",
        title: "Verify service date",
        reason: "The incoming service date conflicts with history.",
        status: "pending",
        taskKind: "verification",
        verificationCode: "VERIFY_DATE",
      },
      {
        taskId: "verify-stale-mileage",
        recommendationId: "mileage-1",
        title: "What's your current mileage?",
        reason: "Mileage has not been updated recently.",
        status: "pending",
        taskKind: "verification",
        verificationCode: "VERIFY_ODOMETER",
        ruleId: "assistant.policy.odometer_stale.v1",
      },
    ]);

    expect(views[0]?.severity).toBe("blocking");
    expect(views[0]?.target.field).toBe("service_date");
    expect(views[1]?.severity).toBe("advisory");
    expect(views[1]?.target.surface).toBe("vehicle");
  });

  it("targets the exact history record and keeps resolution metadata", () => {
    const verification: NowQueueItem = {
      taskId: "verify-timing",
      recommendationId: "timing-1",
      title: "Oil change done early",
      reason: "Confirm why this service was completed early.",
      status: "approved",
      taskKind: "verification",
      verificationCode: "VERIFY_MAINTENANCE_TIMING",
      ruleId: "deviation.policy.engine-oil.v1",
    };
    const timeline: ServiceTimelineEntry[] = [
      {
        serviceId: "service-oil",
        shop: "Dealer",
        serviceDate: "2026-06-10",
        mileage: 58_000,
        lineItems: ["Oil and filter changed"],
        total: "$110",
        evidenceIds: [],
        source: "dealer",
      },
    ];
    const decisionEvent: CatalogDomainEvent = {
      id: "event-1",
      aggregateType: "task",
      aggregateId: verification.taskId,
      eventType: EVENT_TYPES.TASK_DECIDED,
      eventVersion: 1,
      payload: {
        vehicleId: "vehicle-1",
        taskId: verification.taskId,
        decision: "approve",
        decidedAt: "2026-07-30T12:00:00.000Z",
      },
      createdAt: "2026-07-30T12:00:00.000Z",
    };

    const views = buildOwnerVerificationViews([verification], {
      events: [decisionEvent],
      timeline,
      scheduleRows: [
        {
          entryId: "engine-oil",
          serviceName: "Oil and filter change",
          systemGroup: "Engine",
          dueDate: "2027-06-10",
          dueMileage: 65_500,
          status: "upcoming",
          serviceBaseline: {
            performedDate: "2026-06-10",
            performedMileage: 58_000,
            baselineSource: "receipt",
          },
          oemInterval: { months: 12, miles: 7_500 },
          oemSource: { manualTitle: "Owner manual", page: "527", ruleId: "oil-rule" },
          dueDateConfidence: "oem_calendar",
          isStubSchedule: false,
          oemTiming: "early",
          overdueWithoutHistory: false,
        },
      ],
    });

    expect(views[0]?.target).toMatchObject({
      surface: "history",
      recordId: "service-oil",
      field: "maintenance_timing",
    });
    expect(views[0]?.resolution).toBe("approve");
    expect(views[0]?.resolvedAt).toBe("2026-07-30T12:00:00.000Z");
  });
});
