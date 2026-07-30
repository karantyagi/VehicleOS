import {
  projectOwnershipRenewals,
  type OwnershipRenewalProjection,
} from "../ownership/evaluate-ownership-renewals.js";
import type { OwnershipRecordEntry } from "../projections/types.js";
import type {
  OwnerServiceScheduleBoard,
  OwnerServiceScheduleRow,
  OwnerServiceVerdict,
} from "../schedule/build-owner-service-schedule-board.js";

export type OwnerDueItemKind = "maintenance" | "ownership";

export type OwnerDueItem = {
  id: string;
  kind: OwnerDueItemKind;
  verdict: OwnerServiceVerdict;
  title: string;
  subtitle: string | null;
  dueDate: string | null;
  dueMileage: number | null;
  maintenanceRow?: OwnerServiceScheduleRow;
  ownershipRenewal?: OwnershipRenewalProjection;
};

export type OwnerDueItemsSummary = {
  overdue: number;
  dueSoon: number;
  current: number;
  monitor: number;
  needsBaseline: number;
  ownershipOverdue: number;
  ownershipDueSoon: number;
  maintenanceOverdue: number;
  maintenanceDueSoon: number;
};

export type OwnerDueItemsView = {
  items: OwnerDueItem[];
  summary: OwnerDueItemsSummary;
  effectiveMilesPerYear: number;
};

const VERDICT_RANK: Record<OwnerServiceVerdict, number> = {
  overdue: 0,
  due_soon: 1,
  needs_baseline: 2,
  monitor: 3,
  current: 4,
  skip: 5,
};

const actionKindRank = (kind: OwnerDueItemKind, verdict: OwnerServiceVerdict): number => {
  if (verdict !== "overdue" && verdict !== "due_soon") return 100;
  if (kind === "ownership" && verdict === "overdue") return 0;
  if (kind === "maintenance" && verdict === "overdue") return 1;
  if (kind === "ownership" && verdict === "due_soon") return 2;
  if (kind === "maintenance" && verdict === "due_soon") return 3;
  return 100;
};

const compareDueItems = (left: OwnerDueItem, right: OwnerDueItem): number => {
  const actionDelta = actionKindRank(left.kind, left.verdict) - actionKindRank(right.kind, right.verdict);
  if (actionDelta !== 0) return actionDelta;

  const verdictDelta = VERDICT_RANK[left.verdict] - VERDICT_RANK[right.verdict];
  if (verdictDelta !== 0) return verdictDelta;

  const dateLeft = left.dueDate ?? "9999-12-31";
  const dateRight = right.dueDate ?? "9999-12-31";
  if (dateLeft !== dateRight) return dateLeft.localeCompare(dateRight);

  return left.title.localeCompare(right.title);
};

export const buildOwnerDueItems = (input: {
  board: OwnerServiceScheduleBoard | null;
  ownershipRecords: OwnershipRecordEntry[];
  today?: string;
  leadDays?: number;
}): OwnerDueItemsView => {
  const board = input.board;
  const renewals = projectOwnershipRenewals({
    ownershipRecords: input.ownershipRecords,
    today: input.today,
    leadDays: input.leadDays,
  });

  const maintenanceItems: OwnerDueItem[] = (board?.rows ?? []).map((row) => ({
    id: `maintenance:${row.entryId}`,
    kind: "maintenance",
    verdict: row.verdict,
    title: row.displayName,
    subtitle: row.oemRuleLabel,
    dueDate: row.dueDate,
    dueMileage: row.dueMileage,
    maintenanceRow: row,
  }));

  const ownershipItems: OwnerDueItem[] = renewals.map((renewal) => ({
    id: `ownership:${renewal.recordId}`,
    kind: "ownership",
    verdict: renewal.status === "overdue" ? "overdue" : "due_soon",
    title: renewal.title,
    subtitle: renewal.agency,
    dueDate: renewal.expirationDate,
    dueMileage: null,
    ownershipRenewal: renewal,
  }));

  const ownershipOverdue = ownershipItems.filter((item) => item.verdict === "overdue").length;
  const ownershipDueSoon = ownershipItems.filter((item) => item.verdict === "due_soon").length;
  const maintenanceOverdue = board?.summary.overdue ?? 0;
  const maintenanceDueSoon = board?.summary.dueSoon ?? 0;

  return {
    items: [...ownershipItems, ...maintenanceItems].sort(compareDueItems),
    summary: {
      overdue: maintenanceOverdue + ownershipOverdue,
      dueSoon: maintenanceDueSoon + ownershipDueSoon,
      current: board?.summary.current ?? 0,
      monitor: board?.summary.monitor ?? 0,
      needsBaseline: board?.summary.needsBaseline ?? 0,
      ownershipOverdue,
      ownershipDueSoon,
      maintenanceOverdue,
      maintenanceDueSoon,
    },
    effectiveMilesPerYear: board?.effectiveMilesPerYear ?? 12_000,
  };
};

export const isOwnerDueItemActionable = (item: OwnerDueItem): boolean =>
  item.verdict === "overdue" || item.verdict === "due_soon";
