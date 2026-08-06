"use client";

import { ArrowRight, CheckCircle2, CircleHelp, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OwnerReminderItem, QueueItem } from "@/lib/console-types";
import {
  getOwnerQuestionPresentation,
  sortOwnerActions,
  sortOwnerQuestions,
} from "@/lib/owner-attention";

type OwnerHomeBriefProps = {
  reminders: OwnerReminderItem[];
  verifications: QueueItem[];
  onOpenAttention: (taskId?: string) => void;
  onOpenMaintenance: () => void;
};

export function OwnerHomeBrief({
  reminders,
  verifications,
  onOpenAttention,
  onOpenMaintenance,
}: OwnerHomeBriefProps) {
  const actions = sortOwnerActions(reminders.filter((item) => item.effectiveStatus === "pending"));
  const questions = sortOwnerQuestions(
    verifications.filter((item) => item.taskKind === "verification" && item.status === "pending"),
  );
  const blockingQuestion = questions.find((item) => item.severity === "blocking");
  const primaryQuestion = blockingQuestion ?? questions[0] ?? null;
  const primaryAction = actions[0] ?? null;
  const primary = blockingQuestion
    ? { type: "question" as const, item: blockingQuestion }
    : primaryAction
      ? { type: "action" as const, item: primaryAction }
      : primaryQuestion
        ? { type: "question" as const, item: primaryQuestion }
        : null;

  return (
    <section className="space-y-4" aria-label="Your car today">
      <div>
        <p className="text-sm font-medium text-primary">Your car today</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">One clear next step</h2>
      </div>

      {primary ? (
        <article className="rounded-xl border border-primary/35 bg-primary/[0.045] p-5 shadow-[inset_3px_0_0_hsl(var(--primary))]">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
              {primary.type === "action" ? (
                <Wrench className="h-4 w-4" aria-hidden />
              ) : (
                <CircleHelp className="h-4 w-4" aria-hidden />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                {primary.type === "action" ? "Next car action" : "VehicleOS needs your answer"}
              </p>
              <h3 className="mt-1 text-lg font-semibold leading-tight">
                {primary.type === "action"
                  ? primary.item.title
                  : getOwnerQuestionPresentation(primary.item).title}
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {primary.type === "action"
                  ? primary.item.deadlineLabel
                  : getOwnerQuestionPresentation(primary.item).impact}
              </p>
              <Button className="mt-4" size="sm" onClick={() => onOpenAttention(primary.item.taskId)}>
                {primary.type === "action" ? "Review action" : "Answer question"}
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </article>
      ) : (
        <article className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.045] p-5">
          <span className="mt-0.5 rounded-full bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h3 className="font-semibold">You're up to date</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Nothing needs your attention right now. Your longer-term plan is still available anytime.
            </p>
          </div>
        </article>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          className="rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onOpenAttention(primaryAction?.taskId)}
        >
          <span className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-semibold">
              <Wrench className="h-4 w-4 text-primary" aria-hidden />
              Act for your car
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {actions.length} open
            </span>
          </span>
          <span className="mt-2 block text-sm text-muted-foreground">
            {primaryAction ? `${primaryAction.title} · ${primaryAction.deadlineLabel}` : "No maintenance actions waiting."}
          </span>
        </button>
        <button
          type="button"
          className="rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onOpenAttention(primaryQuestion?.taskId)}
        >
          <span className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-semibold">
              <CircleHelp className="h-4 w-4 text-primary" aria-hidden />
              Help the assistant
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {questions.length} {questions.length === 1 ? "question" : "questions"}
            </span>
          </span>
          <span className="mt-2 block text-sm text-muted-foreground">
            {primaryQuestion
              ? getOwnerQuestionPresentation(primaryQuestion).impact
              : "No questions waiting for you."}
          </span>
        </button>
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={onOpenMaintenance}>
        View maintenance plan
        <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
      </Button>
    </section>
  );
}
