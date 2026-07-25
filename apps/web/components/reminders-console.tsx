"use client";

import { BellRing } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OwnerReminderItem } from "@/lib/console-types";
import { cn } from "@/lib/utils";

const urgencyLabel: Record<OwnerReminderItem["urgency"], string> = {
  overdue: "Overdue · act now",
  due_now: "Due now",
  due_soon: "This week",
  upcoming: "Upcoming",
  snoozed: "Snoozed",
};

const urgencyVariant = (urgency: OwnerReminderItem["urgency"]) => {
  if (urgency === "overdue") return "destructive" as const;
  if (urgency === "due_now") return "warning" as const;
  if (urgency === "due_soon") return "oem" as const;
  if (urgency === "snoozed") return "secondary" as const;
  return "outline" as const;
};

type RemindersConsoleProps = {
  items: OwnerReminderItem[];
  disabled?: boolean;
  onDecide: (taskId: string, decision: "approve" | "dismiss" | "snooze", snoozeDays?: number) => void;
  minimal?: boolean;
};

export function RemindersConsole({ items, disabled = false, onDecide, minimal = false }: RemindersConsoleProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={BellRing}
        title="Nothing due"
        description={minimal ? undefined : "Your assistant is watching the schedule. You'll get calendar nudges here when something needs action."}
      />
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const isOverdue = item.urgency === "overdue";
        return (
          <li
            key={item.taskId}
            className={cn(
              "rounded-xl border border-border bg-card p-4 shadow-sm",
              isOverdue && "border-red-500/45 bg-red-500/[0.06] shadow-[inset_3px_0_0_hsl(var(--destructive))]",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3
                    className={cn(
                      "font-semibold leading-tight",
                      isOverdue && "text-red-800 dark:text-red-200",
                    )}
                  >
                    {item.title}
                  </h3>
                  {!minimal || isOverdue || item.urgency === "due_now" ? (
                    <Badge variant={urgencyVariant(item.urgency)}>{urgencyLabel[item.urgency]}</Badge>
                  ) : null}
                </div>
                <p className={cn("text-sm font-medium", isOverdue ? "text-red-700 dark:text-red-300" : "text-foreground")}>
                  {item.deadlineLabel}
                </p>
                <p className="text-sm text-muted-foreground">{item.reason}</p>
                {!minimal && item.escalation ? (
                  <p className={cn("text-sm", isOverdue ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300")}>
                    {item.escalation}
                  </p>
                ) : null}
                {!minimal && item.snoozeUntil && item.effectiveStatus === "snoozed" ? (
                  <p className="text-xs text-muted-foreground">Snoozed until {item.snoozeUntil}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={disabled} onClick={() => onDecide(item.taskId, "approve")}>
                {minimal ? "Done" : "Mark scheduled"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={disabled}
                onClick={() => onDecide(item.taskId, "snooze", 14)}
              >
                Snooze 2 weeks
              </Button>
              {!minimal ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => onDecide(item.taskId, "snooze", 30)}
                  >
                    Snooze 1 month
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => onDecide(item.taskId, "dismiss")}
                  >
                    Dismiss
                  </Button>
                </>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
