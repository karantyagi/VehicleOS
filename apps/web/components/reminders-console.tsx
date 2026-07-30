"use client";

import { CalendarCheck2, CheckCircle2, Wrench } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OwnerReminderItem } from "@/lib/console-types";
import { cn } from "@/lib/utils";

const urgencyLabel: Record<OwnerReminderItem["urgency"], string> = {
  overdue: "Overdue",
  due_now: "Due now",
  due_soon: "Due soon",
  upcoming: "Upcoming",
  snoozed: "Due",
};

const urgencyVariant = (urgency: OwnerReminderItem["urgency"]) => {
  if (urgency === "overdue") return "destructive" as const;
  if (urgency === "due_now") return "warning" as const;
  if (urgency === "due_soon") return "oem" as const;
  return "outline" as const;
};

type AttentionGroup = {
  id: "this_week" | "next_week" | "this_month" | "later";
  title: string;
  description: string;
  items: OwnerReminderItem[];
};

type RemindersConsoleProps = {
  items: OwnerReminderItem[];
  disabled?: boolean;
  onScheduled: (taskId: string) => void;
  onNotNeeded: (taskId: string) => void;
  onRecordDone: () => void;
  onFixData: () => void;
  minimal?: boolean;
};

const buildGroups = (items: OwnerReminderItem[]): AttentionGroup[] => {
  const active = items.filter((item) => item.effectiveStatus === "pending");
  const groups: AttentionGroup[] = [
    {
      id: "this_week",
      title: "This week",
      description: "Overdue work stays here until it is handled.",
      items: active.filter(
        (item) => item.attentionWindow === "overdue" || item.attentionWindow === "this_week",
      ),
    },
    {
      id: "next_week",
      title: "Next week",
      description: "Visible early when you may need time to make an appointment.",
      items: active.filter((item) => item.attentionWindow === "next_week"),
    },
    {
      id: "this_month",
      title: "Later this month",
      description: "Planning ahead; no need to act today.",
      items: active.filter((item) => item.attentionWindow === "this_month"),
    },
    {
      id: "later",
      title: "Later",
      description: "Long-range items remain in the full maintenance schedule.",
      items: active.filter((item) => item.attentionWindow === "later"),
    },
  ];
  return groups.filter((group) => group.items.length > 0);
};

export function RemindersConsole({
  items,
  disabled = false,
  onScheduled,
  onNotNeeded,
  onRecordDone,
  onFixData,
  minimal = false,
}: RemindersConsoleProps) {
  const groups = buildGroups(items);

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="All clear this week"
        description={minimal ? undefined : "Nothing needs action. Your maintenance schedule is still available anytime."}
      />
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const content = (
          <ul className="mt-3 space-y-3">
            {group.items.map((item) => {
              const isOverdue = item.urgency === "overdue";
              return (
                <li
                  key={item.taskId}
                  className={cn(
                    "rounded-xl border border-border bg-card p-4 shadow-sm",
                    isOverdue &&
                      "border-red-500/45 bg-red-500/[0.06] shadow-[inset_3px_0_0_hsl(var(--destructive))]",
                  )}
                >
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
                      <Badge variant={urgencyVariant(item.urgency)}>{urgencyLabel[item.urgency]}</Badge>
                    </div>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isOverdue ? "text-red-700 dark:text-red-300" : "text-foreground",
                      )}
                    >
                      {item.deadlineLabel}
                    </p>
                    <p className="text-sm text-muted-foreground">{item.reason}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={disabled}
                      onClick={() => onScheduled(item.taskId)}
                    >
                      <CalendarCheck2 className="mr-1.5 h-4 w-4" aria-hidden />
                      Scheduled
                    </Button>
                    <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={onRecordDone}>
                      <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />
                      Done
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onFixData}>
                      <Wrench className="mr-1.5 h-4 w-4" aria-hidden />
                      Fix this
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={disabled}
                      onClick={() => onNotNeeded(item.taskId)}
                    >
                      Not needed
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        );

        if (group.id === "later") {
          return (
            <details key={group.id} className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">
                {group.title} · {group.items.length}
              </summary>
              {!minimal ? <p className="mt-1 text-xs text-muted-foreground">{group.description}</p> : null}
              {content}
            </details>
          );
        }

        return (
          <section key={group.id} aria-labelledby={`attention-${group.id}`}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={`attention-${group.id}`} className="text-base font-semibold tracking-tight text-foreground">
                {group.title}
              </h2>
              <span className="text-xs tabular-nums text-muted-foreground">{group.items.length}</span>
            </div>
            {!minimal ? <p className="mt-1 text-xs text-muted-foreground">{group.description}</p> : null}
            {content}
          </section>
        );
      })}
    </div>
  );
}
