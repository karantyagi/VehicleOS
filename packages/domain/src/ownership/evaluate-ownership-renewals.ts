import type { MaintenanceRecommendation } from "../policy/types.js";
import type { OwnershipRecordEntry, VehicleProjectionState } from "../projections/types.js";

export type OwnershipRenewalStatus = "overdue" | "due_soon";

export type OwnershipRenewalProjection = {
  recordId: string;
  eventType: OwnershipRecordEntry["eventType"];
  title: string;
  expirationDate: string;
  status: OwnershipRenewalStatus;
  agency: string;
  description: string;
};

export const DEFAULT_RENEWAL_LEAD_DAYS = 60;

const EXPIRATION_PATTERN = /expiration date:\s*(\d{4}-\d{2}-\d{2})/i;
const RENEWAL_EVENT_TYPES = new Set<OwnershipRecordEntry["eventType"]>(["registration", "inspection"]);

export const parseExpirationDate = (record: Pick<OwnershipRecordEntry, "details">): string | null => {
  for (const line of record.details) {
    const match = line.match(EXPIRATION_PATTERN);
    if (match?.[1]) return match[1];
  }
  return null;
};

export const isRenewalAlreadyHandled = (record: OwnershipRecordEntry): boolean =>
  record.details.some((line) => /already renewed/i.test(line));

const parseIsoDate = (value: string): Date => new Date(`${value}T12:00:00.000Z`);

const daysBetween = (from: string, to: string): number => {
  const start = parseIsoDate(from).getTime();
  const end = parseIsoDate(to).getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
};

const resolveRenewalStatus = (input: {
  today: string;
  expirationDate: string;
  leadDays: number;
}): OwnershipRenewalStatus | null => {
  const daysUntil = daysBetween(input.today, input.expirationDate);
  if (daysUntil < 0) return "overdue";
  if (daysUntil <= input.leadDays) return "due_soon";
  return null;
};

const renewalTitle = (record: OwnershipRecordEntry): string => {
  if (record.eventType === "inspection") return "Vehicle inspection renewal";
  if (record.eventType === "registration") return "Registration renewal";
  return "Ownership renewal";
};

const renewalRuleId = (eventType: OwnershipRecordEntry["eventType"]): string => {
  if (eventType === "inspection") return "renewal.policy.inspection.v1";
  if (eventType === "registration") return "renewal.policy.registration.v1";
  return "renewal.policy.other.v1";
};

export const projectOwnershipRenewals = (input: {
  ownershipRecords: OwnershipRecordEntry[];
  today?: string;
  leadDays?: number;
}): OwnershipRenewalProjection[] => {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const leadDays = input.leadDays ?? DEFAULT_RENEWAL_LEAD_DAYS;

  const projections: OwnershipRenewalProjection[] = [];

  for (const record of input.ownershipRecords) {
    if (!RENEWAL_EVENT_TYPES.has(record.eventType)) continue;
    if (isRenewalAlreadyHandled(record)) continue;

    const expirationDate = parseExpirationDate(record);
    if (!expirationDate) continue;

    const status = resolveRenewalStatus({ today, expirationDate, leadDays });
    if (!status) continue;

    projections.push({
      recordId: record.recordId,
      eventType: record.eventType,
      title: renewalTitle(record),
      expirationDate,
      status,
      agency: record.agency,
      description: record.description,
    });
  }

  const statusRank: Record<OwnershipRenewalStatus, number> = { overdue: 0, due_soon: 1 };

  return projections.sort((left, right) => {
    const rankDelta = statusRank[left.status] - statusRank[right.status];
    if (rankDelta !== 0) return rankDelta;
    return left.expirationDate.localeCompare(right.expirationDate);
  });
};

export const evaluateOwnershipRenewalDue = (input: {
  state: VehicleProjectionState;
  today?: string;
  leadDays?: number;
}): MaintenanceRecommendation | null => {
  const renewals = projectOwnershipRenewals({
    ownershipRecords: input.state.ownershipRecords,
    today: input.today,
    leadDays: input.leadDays,
  });

  const next = renewals[0];
  if (!next) return null;

  const deadlineLabel =
    next.status === "overdue"
      ? `Registration expired ${next.expirationDate}`
      : `Registration expires ${next.expirationDate}`;

  return {
    recommendationId: crypto.randomUUID(),
    title: next.title,
    reason: `${deadlineLabel} — ${next.agency}. Renew before the deadline to avoid lapses.`,
    confidence: 0.97,
    evidenceIds: [],
    ruleId: renewalRuleId(next.eventType),
    dueBy: next.expirationDate,
  };
};

export const isRenewalRuleId = (ruleId: string | undefined): boolean =>
  Boolean(ruleId?.startsWith("renewal.policy."));
