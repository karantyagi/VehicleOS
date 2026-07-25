import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findLastMatchingService } from "./match-service-name.js";
import { projectMaintenanceSchedule } from "../schedule/project-maintenance-schedule.js";
import { buildOwnerReminderViews } from "../now/build-owner-reminders.js";
import type { KnowledgeScheduleEntry, ServiceTimelineEntry } from "../projections/types.js";

const knowledgeRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../knowledge");

const loadPackEntries = (packId: string): KnowledgeScheduleEntry[] => {
  const pack = JSON.parse(
    readFileSync(join(knowledgeRoot, "packs", `${packId}.v1.json`), "utf8"),
  ) as {
    manualTitle: string;
    entries: Array<{
      entryId: string;
      serviceName: string;
      intervalMiles?: number | null;
      intervalMonths?: number | null;
      sourcePage: string;
      ruleId: string;
    }>;
  };

  const recordedAt = "2026-07-25T00:00:00.000Z";
  return pack.entries.map((entry) => ({
    entryId: entry.entryId,
    serviceName: entry.serviceName,
    intervalMiles: entry.intervalMiles ?? undefined,
    intervalMonths: entry.intervalMonths ?? undefined,
    sourceDocumentId: `pack-${packId}`,
    sourcePage: entry.sourcePage,
    manualTitle: pack.manualTitle,
    recordedAt,
  }));
};

const carfaxOilRow = (): ServiceTimelineEntry => ({
  serviceId: "svc-carfax-oil",
  shop: "MetroWest Acura",
  serviceDate: "2026-05-13",
  mileage: 57_160,
  lineItems: ["Oil and filter changed"],
  total: "$0.00",
  evidenceIds: [],
  source: "carfax_import",
});

describe("OEM pack dogfood — 2021 TLX SH-AWD", () => {
  const knowledgeSchedule = loadPackEntries("acura-tlx-2021-sh-awd");

  it("matches CARFAX oil line to Code B", () => {
    const codeB = knowledgeSchedule.find((entry) => entry.entryId === "code-b");
    expect(codeB).toBeDefined();
    expect(findLastMatchingService([carfaxOilRow()], codeB!.serviceName)?.mileage).toBe(57_160);
  });

  it("does not show false overdue oil reminder after CARFAX baseline", () => {
    const scheduleRows = projectMaintenanceSchedule({
      knowledgeSchedule,
      timeline: [carfaxOilRow()],
      currentMileage: 58_819,
      today: "2026-07-25",
      horizonMode: "extended",
    }).rows;

    const codeBRow = scheduleRows.find((row) => row.entryId === "code-b");
    expect(codeBRow?.status).toBe("upcoming");

    const reminders = buildOwnerReminderViews({
      items: [
        {
          taskId: "task-oil-stale",
          recommendationId: "rec-1",
          title: "Replace engine oil and filter (Maintenance Minder B) due",
          reason:
            "OEM schedule (P. 527 — Code B): every 7,500 mi. 59,024 miles since last recorded replace engine oil and filter (maintenance minder b).",
          status: "pending",
          taskKind: "recommendation",
          ruleId: "knowledge.policy.code-b.v1",
        },
      ],
      scheduleRows: scheduleRows,
      today: "2026-07-25",
    });

    expect(reminders).toHaveLength(0);
  });
});
