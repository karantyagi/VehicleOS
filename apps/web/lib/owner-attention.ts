import type { OwnerReminderItem, QueueItem } from "@/lib/console-types";

export type OwnerQuestionPresentation = {
  kind: "verify" | "personalize";
  label: "Verify" | "Personalize";
  title: string;
  impact: string;
  approveLabel: string;
  deferLabel: string;
};

const personalizationCodes = new Set<QueueItem["verificationCode"]>([
  "VERIFY_MAINTENANCE_TIMING",
  "VERIFY_OWNER_INTERVAL",
]);

export function getOwnerQuestionPresentation(item: QueueItem): OwnerQuestionPresentation {
  const kind: OwnerQuestionPresentation["kind"] = personalizationCodes.has(item.verificationCode)
    ? "personalize"
    : "verify";
  const base = {
    kind,
    label: kind === "verify" ? ("Verify" as const) : ("Personalize" as const),
    deferLabel: "Review later",
  };

  switch (item.verificationCode) {
    case "VERIFY_ODOMETER":
      return {
        ...base,
        title: "Is your current odometer correct?",
        impact: "This keeps your due-mileage planning accurate.",
        approveLabel: "Save this odometer",
      };
    case "VERIFY_DATE":
      return {
        ...base,
        title: "Can you confirm this service date?",
        impact: "This keeps the service timeline accurate.",
        approveLabel: "Yes, use this date",
      };
    case "VERIFY_VEHICLE_PROFILE":
      return {
        ...base,
        title: "Does this record belong to your vehicle?",
        impact: "This keeps another vehicle's record out of your history.",
        approveLabel: "Yes, this is my vehicle",
      };
    case "VERIFY_IMPORT_ROW":
      return {
        ...base,
        title: "Can you confirm this imported service record?",
        impact: "This keeps unconfirmed records out of your trusted history.",
        approveLabel: "Yes, use this record",
      };
    case "VERIFY_MAINTENANCE_TIMING":
      return {
        ...base,
        title: "Should VehicleOS remember this maintenance pattern?",
        impact: "This helps tune future maintenance timing to how you use your car.",
        approveLabel: "Save this pattern",
      };
    case "VERIFY_OWNER_INTERVAL":
      return {
        ...base,
        title: "Does this interval fit how you use your car?",
        impact: "This changes the interval VehicleOS uses for this service.",
        approveLabel: "Use this interval",
      };
    default:
      return {
        ...base,
        title: item.title,
        impact: "This keeps your maintenance plan accurate.",
        approveLabel: "Yes, use this detail",
      };
  }
}

export function sortOwnerQuestions(items: QueueItem[]): QueueItem[] {
  return [...items].sort((left, right) => {
    const severity = (item: QueueItem) => (item.severity === "blocking" ? 0 : 1);
    const kind = (item: QueueItem) => (getOwnerQuestionPresentation(item).kind === "verify" ? 0 : 1);
    return (
      severity(left) - severity(right) ||
      kind(left) - kind(right) ||
      getOwnerQuestionPresentation(left).title.localeCompare(getOwnerQuestionPresentation(right).title)
    );
  });
}

export function sortOwnerActions(items: OwnerReminderItem[]): OwnerReminderItem[] {
  const urgencyRank: Record<OwnerReminderItem["urgency"], number> = {
    overdue: 0,
    due_now: 1,
    due_soon: 2,
    upcoming: 3,
  };

  return [...items].sort(
    (left, right) =>
      urgencyRank[left.urgency] - urgencyRank[right.urgency] ||
      (left.dueBy ?? "9999-12-31").localeCompare(right.dueBy ?? "9999-12-31") ||
      left.title.localeCompare(right.title),
  );
}
