"use client";

import { BellRing } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OwnerReminderItem } from "@/lib/console-types";
import { cn } from "@/lib/utils";

const urgencyLabel: Record<OwnerReminderItem["urgency"], string> = {
  overdue: "Overdue",
  due_now: "Due now",
  due_soon: "This week",
  upcoming: "Upcoming",
  snoozed: "Snoozed",
};

const urgencyVariant = (urgency: OwnerReminderItem["urgency"]) => {
  if (urgency === "overdue" || urgency === "due_now") return "warning" as const;
  if (urgency === "due_soon") return "oem" as const;
  if (urgency === "snoozed") return "secondary" as const;
  return "outline" as const;
};

type RemindersConsoleProps = {
  items: OwnerReminderItem[];
  disabled?: boolean;
  onDecide: (taskId: string, decision: "approve" | "dismiss" | "snooze", snoozeDays?: number) => void;
};

export function RemindersConsole({ items, disabled = false, onDecide }: RemindersConsoleProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={BellRing}
        title="Nothing due right now"
        description="Your assistant is watching the schedule. You'll get calendar nudges here when something needs action."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.taskId}
          className={cn(
            "rounded-xl border border-border bg-card p-4 shadow-sm",
            item.urgency === "overdue" && "border-amber-500/40 bg-amber-500/5",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold leading-tight">{item.title}</h3>
                <Badge variant={urgencyVariant(item.urgency)}>{urgencyLabel[item.urgency]}</Badge>
              </div>
              <p className="text-sm font-medium text-foreground">{item.deadlineLabel}</p>
              <p className="text-sm text-muted-foreground">{item.reason}</p>
              {item.escalation ? (
                <p className="text-sm text-amber-700 dark:text-amber-300">{item.escalation}</p>
              ) : null}
              {item.snoozeUntil && item.effectiveStatus === "snoozed" ? (
                <p className="text-xs text-muted-foreground">
                  Snoozed until {item.snoozeUntil}
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={disabled} onClick={() => onDecide(item.taskId, "approve")}>
              Mark scheduled
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
          </div>
        </li>
      ))}
    </ul>
  );
}
