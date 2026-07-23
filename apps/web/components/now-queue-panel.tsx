"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type QueueItem = {
  taskId: string;
  title: string;
  reason: string;
  status: string;
  taskKind?: "recommendation" | "verification";
  ruleId?: string;
};

const classifyItem = (
  item: QueueItem,
): "verification" | "seasonal" | "oem" | "schedule" | "other" => {
  if (item.taskKind === "verification") return "verification";
  if (item.ruleId?.startsWith("seasonal.policy.")) return "seasonal";
  if (item.ruleId?.startsWith("knowledge.policy.")) return "oem";
  if (item.ruleId?.startsWith("schedule.policy.")) return "schedule";
  return "other";
};

const categoryLabel = (category: ReturnType<typeof classifyItem>): string => {
  if (category === "verification") return "Verify";
  if (category === "seasonal") return "Seasonal";
  if (category === "oem") return "OEM schedule";
  if (category === "schedule") return "Maintenance";
  return "Action";
};

const badgeVariant = (
  category: ReturnType<typeof classifyItem>,
): "warning" | "seasonal" | "oem" | "default" => {
  if (category === "verification") return "warning";
  if (category === "seasonal") return "seasonal";
  if (category === "oem") return "oem";
  return "default";
};

const severityRail = (category: ReturnType<typeof classifyItem>): string => {
  if (category === "verification") return "border-l-amber-500";
  if (category === "seasonal") return "border-l-sky-500";
  if (category === "oem") return "border-l-violet-500";
  if (category === "schedule") return "border-l-primary";
  return "border-l-border";
};

type NowQueuePanelProps = {
  items: QueueItem[];
  disabled?: boolean;
  onDecide: (taskId: string, decision: "approve" | "dismiss" | "snooze") => void;
};

export function NowQueuePanel({ items, disabled = false, onDecide }: NowQueuePanelProps) {
  const pending = items.filter((item) => item.status === "pending");
  const recent = items.filter((item) => item.status !== "pending");

  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Plain-English recommendations — you approve, dismiss, or snooze before anything changes.
      </p>

      {pending.length === 0 ? (
        <p className="surface-inset px-4 py-6 text-center text-sm text-muted-foreground">
          Nothing needs a decision right now. Check back after your next service or refresh recommendations.
        </p>
      ) : (
        <ul className="space-y-3">
          {pending.map((item) => {
            const category = classifyItem(item);
            return (
              <li
                key={item.taskId}
                className={`surface-panel border-l-4 ${severityRail(category)} p-4 pl-3.5`}
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm font-semibold tracking-tight">{item.title}</strong>
                    <Badge variant={badgeVariant(category)}>{categoryLabel(category)}</Badge>
                  </div>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">{item.reason}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={disabled}
                    onClick={() => onDecide(item.taskId, "approve")}
                  >
                    {item.taskKind === "verification" ? "Mark resolved" : "Approve"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={disabled}
                    onClick={() => onDecide(item.taskId, "dismiss")}
                  >
                    Dismiss
                  </Button>
                  {item.taskKind !== "verification" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={disabled}
                      onClick={() => onDecide(item.taskId, "snooze")}
                    >
                      Snooze
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {recent.length > 0 ? (
        <details className="surface-inset px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium text-foreground">Recent decisions ({recent.length})</summary>
          <ul className="mt-3 space-y-2">
            {recent.map((item) => (
              <li key={item.taskId} className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                <strong>{item.title}</strong>
                <Badge variant="secondary">{item.status}</Badge>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
