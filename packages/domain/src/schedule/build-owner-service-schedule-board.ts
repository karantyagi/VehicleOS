import { findMatchingServices, lineMatchesServiceName } from "../knowledge/match-service-name.js";
import type { ServiceAliasRegistry } from "../knowledge/service-alias-registry.js";
import type { OwnerContextMemory } from "../owner-context/types.js";
import type { KnowledgeScheduleEntry, ServiceTimelineEntry } from "../projections/types.js";
import {
  projectMaintenanceSchedule,
  type ScheduleProjectionRow,
  type ScheduleProjectionStatus,
} from "./project-maintenance-schedule.js";
import { isOwnerHabitEntryId, OWNER_HABIT_DEFINITIONS } from "./owner-habit-definitions.js";
import { projectOwnerHabitScheduleRows } from "./project-owner-habit-schedule-rows.js";

export type OwnerServiceHistoryEvent = {
  serviceId: string;
  serviceDate: string;
  mileage: number;
  shop: string;
  lineItem: string;
  source: ServiceTimelineEntry["source"];
};

export type OwnerServiceVerdict = "current" | "due_soon" | "overdue" | "monitor" | "skip" | "needs_baseline";

export type OwnerServiceScheduleRow = ScheduleProjectionRow & {
  displayName: string;
  mmCode: string | null;
  oemRuleLabel: string;
  verdict: OwnerServiceVerdict;
  historyEvents: OwnerServiceHistoryEvent[];
  gapNote: string | null;
  milesSinceLast: number | null;
};

export type BuildOwnerServiceScheduleBoardInput = {
  knowledgeSchedule: KnowledgeScheduleEntry[];
  timeline: ServiceTimelineEntry[];
  currentMileage: number;
  effectiveMilesPerYear?: number;
  ownedSince?: string | null;
  today?: string;
  dueSoonDays?: number;
  ownerContextMemory?: OwnerContextMemory | null;
  serviceAliasRegistry?: ServiceAliasRegistry | null;
};

export type OwnerServiceScheduleBoard = {
  rows: OwnerServiceScheduleRow[];
  summary: {
    overdue: number;
    dueSoon: number;
    current: number;
    monitor: number;
    needsBaseline: number;
  };
  effectiveMilesPerYear: number;
};

const HIDDEN_ENTRY_IDS = new Set(["code-a"]);

const formatIntervalRule = (row: ScheduleProjectionRow): string => {
  if (row.overlayLabel) return row.overlayLabel;
  const parts: string[] = [];
  if (row.oemInterval.miles) parts.push(`${row.oemInterval.miles.toLocaleString()} mi`);
  if (row.oemInterval.months) parts.push(`${row.oemInterval.months} mo`);
  if (parts.length === 0) return "Maintenance Minder — adaptive";
  return `Every ${parts.join(" / ")}`;
};

const inferMmCode = (entryId: string, serviceName: string): string | null => {
  if (entryId === "code-b") return "B";
  const subMatch = entryId.match(/^mm-sub-(\d+)/);
  if (subMatch) return subMatch[1] ?? null;
  const nameMatch = serviceName.match(/Minder (?:sub )?(\d|[AB])/i);
  return nameMatch?.[1] ?? null;
};

const simplifyDisplayName = (serviceName: string): string => {
  return serviceName.replace(/\s*\(Maintenance Minder[^)]*\)/i, "").trim();
};

const mapVerdict = (input: {
  status: ScheduleProjectionStatus;
  currentMileage: number;
  dueMileage: number | null;
  milesSinceLast: number | null;
  oemIntervalMiles: number | null;
}): OwnerServiceVerdict => {
  if (input.status === "needs_baseline") return "needs_baseline";
  if (input.status === "overdue") return "overdue";
  if (input.status === "due_soon") return "due_soon";

  if (
    input.milesSinceLast !== null &&
    input.oemIntervalMiles !== null &&
    input.milesSinceLast >= input.oemIntervalMiles * 0.9
  ) {
    return "due_soon";
  }

  if (input.dueMileage !== null && input.currentMileage >= input.dueMileage) {
    return "overdue";
  }

  if (input.dueMileage !== null && input.currentMileage >= input.dueMileage - 1500) {
    return "due_soon";
  }

  if (input.status === "upcoming") {
    const farMiles =
      input.dueMileage !== null ? input.dueMileage - input.currentMileage : null;
    if (farMiles !== null && farMiles > 20_000) return "monitor";
    if (farMiles !== null && farMiles > 8_000) return "current";
    return "current";
  }

  return "monitor";
};

const buildGapNote = (input: {
  row: ScheduleProjectionRow;
  historyCount: number;
  milesSinceLast: number | null;
  verdict: OwnerServiceVerdict;
}): string | null => {
  if (input.verdict === "needs_baseline") {
    return "Import service history to personalize due dates for this item.";
  }
  if (input.historyCount === 0) {
    return "Not yet recorded in your history — OEM says monitor until due.";
  }
  if (input.verdict === "overdue" || input.verdict === "due_soon") {
    if (input.milesSinceLast !== null && input.row.oemInterval.miles) {
      return `${input.milesSinceLast.toLocaleString()} mi since last — OEM fallback ${input.row.oemInterval.miles.toLocaleString()} mi.`;
    }
    return "Due based on OEM interval and your last recorded service.";
  }
  if (input.verdict === "monitor") {
    return "On track — next OEM trigger is still far out.";
  }
  if (input.verdict === "skip" || (input.verdict === "current" && input.historyCount > 0)) {
    return "Recently serviced — no action needed now.";
  }
  return null;
};

const flattenHistoryEvents = (
  timeline: ServiceTimelineEntry[],
  serviceName: string,
  entryId: string,
  options: {
    canonicalServiceId?: string | null;
    serviceAliasRegistry?: ServiceAliasRegistry | null;
  },
): OwnerServiceHistoryEvent[] => {
  if (isOwnerHabitEntryId(entryId)) {
    const habit = OWNER_HABIT_DEFINITIONS.find((definition) => definition.entryId === entryId);
    if (!habit) return [];

    return timeline.flatMap((entry) =>
      entry.lineItems
        .filter((lineItem) => habit.lineItemPattern.test(lineItem))
        .map((lineItem) => ({
          serviceId: entry.serviceId,
          serviceDate: entry.serviceDate,
          mileage: entry.mileage,
          shop: entry.shop,
          lineItem,
          source: entry.source,
        })),
    );
  }

  const matches = findMatchingServices(timeline, serviceName, options);
  return matches.flatMap((entry) =>
    entry.lineItems
      .filter((lineItem) => lineMatchesServiceName(lineItem, serviceName, options))
      .map((lineItem) => ({
        serviceId: entry.serviceId,
        serviceDate: entry.serviceDate,
        mileage: entry.mileage,
        shop: entry.shop,
        lineItem,
        source: entry.source,
      })),
  );
};

export const buildOwnerServiceScheduleBoard = (
  input: BuildOwnerServiceScheduleBoardInput,
): OwnerServiceScheduleBoard => {
  const projection = projectMaintenanceSchedule({
    knowledgeSchedule: input.knowledgeSchedule,
    timeline: input.timeline,
    currentMileage: input.currentMileage,
    effectiveMilesPerYear: input.effectiveMilesPerYear,
    ownedSince: input.ownedSince,
    today: input.today,
    dueSoonDays: input.dueSoonDays,
    ownerContextMemory: input.ownerContextMemory,
    serviceAliasRegistry: input.serviceAliasRegistry,
    horizonMode: "complete",
  });

  const habitRows = projectOwnerHabitScheduleRows({
    timeline: input.timeline,
    currentMileage: input.currentMileage,
    ownerContextMemory: input.ownerContextMemory,
    effectiveMilesPerYear: input.effectiveMilesPerYear,
    today: input.today,
    dueSoonDays: input.dueSoonDays,
  });

  const allProjectionRows = [...projection.rows, ...habitRows];

  const scheduleByEntryId = new Map(
    input.knowledgeSchedule.map((entry) => [entry.entryId, entry]),
  );

  const rows: OwnerServiceScheduleRow[] = allProjectionRows
    .filter((row) => !HIDDEN_ENTRY_IDS.has(row.entryId))
    .map((row) => {
      const scheduleEntry = scheduleByEntryId.get(row.entryId);
      const matchOptions = {
        canonicalServiceId: scheduleEntry?.canonicalServiceId ?? null,
        serviceAliasRegistry: input.serviceAliasRegistry,
      };
      const historyEvents = flattenHistoryEvents(
        input.timeline,
        row.serviceName,
        row.entryId,
        matchOptions,
      );
      const lastEvent = historyEvents.at(-1);
      const milesSinceLast =
        lastEvent !== undefined ? input.currentMileage - lastEvent.mileage : null;
      const verdict = mapVerdict({
        status: row.status,
        currentMileage: input.currentMileage,
        dueMileage: row.dueMileage,
        milesSinceLast,
        oemIntervalMiles: row.oemInterval.miles,
      });
      const gapNote = buildGapNote({
        row,
        historyCount: historyEvents.length,
        milesSinceLast,
        verdict,
      });

      return {
        ...row,
        displayName: simplifyDisplayName(row.serviceName),
        mmCode: inferMmCode(row.entryId, row.serviceName),
        oemRuleLabel: formatIntervalRule(row),
        verdict,
        historyEvents,
        gapNote,
        milesSinceLast,
      };
    })
    .sort((left, right) => {
      const rank: Record<OwnerServiceVerdict, number> = {
        overdue: 0,
        due_soon: 1,
        needs_baseline: 2,
        current: 3,
        monitor: 4,
        skip: 5,
      };
      const rankDelta = rank[left.verdict] - rank[right.verdict];
      if (rankDelta !== 0) return rankDelta;
      if (left.dueDate && right.dueDate) return left.dueDate.localeCompare(right.dueDate);
      return left.displayName.localeCompare(right.displayName);
    });

  const summary = {
    overdue: rows.filter((row) => row.verdict === "overdue").length,
    dueSoon: rows.filter((row) => row.verdict === "due_soon").length,
    current: rows.filter((row) => row.verdict === "current" || row.verdict === "skip").length,
    monitor: rows.filter((row) => row.verdict === "monitor").length,
    needsBaseline: rows.filter((row) => row.verdict === "needs_baseline").length,
  };

  return {
    rows,
    summary,
    effectiveMilesPerYear: projection.effectiveMilesPerYear,
  };
};
