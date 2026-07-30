"use client";

import { BellRing, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { MaintenanceIntelligenceSummary } from "@/components/maintenance-intelligence-summary";
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

const SNOOZE_OPTIONS = [
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "3 weeks", days: 21 },
  { label: "1 month", days: 30 },
] as const;

type RemindersConsoleProps = {
  items: OwnerReminderItem[];
  disabled?: boolean;
  onDecide: (taskId: string, decision: "approve" | "dismiss" | "snooze", snoozeDays?: number) => void;
  minimal?: boolean;
};

export function RemindersConsole({ items, disabled = false, onDecide, minimal = false }: RemindersConsoleProps) {
  const [snoozePickerTaskId, setSnoozePickerTaskId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

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
        const isSnoozePickerOpen = snoozePickerTaskId === item.taskId;
        const isExpanded = expandedTaskId === item.taskId;

        return (
          <li
            key={item.taskId}
            className={cn(
              "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
              isOverdue && "border-red-500/45 bg-red-500/[0.06] shadow-[inset_3px_0_0_hsl(var(--destructive))]",
            )}
          >
            <button
              type="button"
              className="flex w-full items-start gap-3 p-4 text-left"
              aria-expanded={isExpanded}
              onClick={() =>
                setExpandedTaskId(isExpanded ? null : item.taskId)
              }
            >
              <div className="min-w-0 flex-1 space-y-1">
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
              </div>
              <span className="shrink-0 pt-1 text-muted-foreground">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" aria-hidden />
                ) : (
                  <ChevronDown className="h-4 w-4" aria-hidden />
                )}
              </span>
            </button>

            {isExpanded ? (
              <div className="space-y-4 border-t border-border/60 px-4 pb-4 pt-3">
                {item.intelligence ? (
                  <MaintenanceIntelligenceSummary intelligence={item.intelligence} />
                ) : (
                  <div className="space-y-3">
                    <section className="rounded-lg border border-border/70 bg-background/75 p-3.5">
                      <p className="text-sm font-semibold text-foreground">Why this reminder</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
                    </section>
                    <section className="rounded-lg border border-border/70 bg-background/75 p-3.5">
                      <p className="text-sm font-semibold text-foreground">
                        Recommended way to get it done
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Phase 2 · upcoming · in development for this item.
                      </p>
                    </section>
                  </div>
                )}

                {!minimal && item.escalation ? (
                  <p className={cn("text-sm", isOverdue ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300")}>
                    {item.escalation}
                  </p>
                ) : null}
                {!minimal && item.snoozeUntil && item.effectiveStatus === "snoozed" ? (
                  <p className="text-xs text-muted-foreground">Snoozed until {item.snoozeUntil}</p>
                ) : null}

                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" disabled={disabled} onClick={() => onDecide(item.taskId, "approve")}>
                      {minimal ? "Done" : "Mark scheduled"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={isSnoozePickerOpen ? "default" : "secondary"}
                      disabled={disabled}
                      aria-expanded={isSnoozePickerOpen}
                      onClick={() => setSnoozePickerTaskId(isSnoozePickerOpen ? null : item.taskId)}
                    >
                      Snooze
                    </Button>
                    {!minimal ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={disabled}
                        onClick={() => onDecide(item.taskId, "dismiss")}
                      >
                        Dismiss
                      </Button>
                    ) : null}
                  </div>
                  {isSnoozePickerOpen ? (
                    <div className="flex flex-wrap gap-2 rounded-lg border border-border/70 bg-muted/30 p-2">
                      {SNOOZE_OPTIONS.map((option) => (
                        <Button
                          key={option.days}
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={disabled}
                          onClick={() => {
                            onDecide(item.taskId, "snooze", option.days);
                            setSnoozePickerTaskId(null);
                          }}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
