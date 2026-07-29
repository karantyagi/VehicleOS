import type { MaintenanceRecommendation } from "../policy/types.js";
import { resolveRenewalRuleId } from "../ownership/resolve-renewal-rule-id.js";
import type { OwnerDueItem } from "./build-owner-due-items.js";

export const dueItemToRecommendation = (item: OwnerDueItem): MaintenanceRecommendation => {
  if (item.kind === "ownership" && item.ownershipRenewal) {
    const renewal = item.ownershipRenewal;
    const deadlineLabel =
      renewal.status === "overdue"
        ? `Registration expired ${renewal.expirationDate}`
        : `Registration expires ${renewal.expirationDate}`;

    return {
      recommendationId: crypto.randomUUID(),
      title: renewal.title,
      reason: `${deadlineLabel} — ${renewal.agency}. Renew before the deadline to avoid lapses.`,
      confidence: 0.97,
      evidenceIds: [],
      ruleId: resolveRenewalRuleId({
        eventType: renewal.eventType,
        agency: renewal.agency,
      }),
      dueBy: renewal.expirationDate,
    };
  }

  if (item.kind === "maintenance" && item.maintenanceRow) {
    const row = item.maintenanceRow;
    const pageHint = row.oemSource.page ? ` (${row.oemSource.page})` : "";

    return {
      recommendationId: crypto.randomUUID(),
      title: `${row.displayName} due`,
      reason:
        row.gapNote ??
        `OEM schedule${pageHint}: next due ${row.dueDate ?? "soon"}${row.dueMileage ? ` · ${row.dueMileage.toLocaleString()} mi` : ""}.`,
      confidence: 0.93,
      evidenceIds: [],
      ruleId: `knowledge.policy.${row.entryId}.v1`,
      dueBy: row.dueDate,
    };
  }

  throw new Error("Owner due item is missing maintenance or ownership payload.");
};
