"use client";

import type { VerificationMaturityView } from "@/lib/console-types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type VerificationMaturityPanelProps = {
  maturity: VerificationMaturityView;
};

const stageLabel: Record<VerificationMaturityView["maturityStage"], string> = {
  onboarding: "Learning your car",
  learning: "Baselines locking in",
  steady: "Steady state",
};

const formatWeekLabel = (weekStart: string): string => {
  const date = new Date(`${weekStart}T12:00:00.000Z`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export function VerificationMaturityPanel({ maturity }: VerificationMaturityPanelProps) {
  const maxCount = Math.max(
    1,
    ...maturity.weeklyCounts.map((bucket) => bucket.count),
    ...maturity.expectedCurve.map((bucket) => bucket.count),
  );

  const deltaLabel =
    maturity.weekOverWeekDelta === 0
      ? "same as last week"
      : maturity.weekOverWeekDelta < 0
        ? `${Math.abs(maturity.weekOverWeekDelta)} fewer than last week`
        : `${maturity.weekOverWeekDelta} more than last week`;

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Verification this week
          </p>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums tracking-tight">{maturity.thisWeekCount}</span>
            <span className="text-sm text-muted-foreground">{deltaLabel}</span>
          </div>
        </div>
        <Badge variant={maturity.maturityStage === "steady" ? "oem" : "secondary"}>
          {stageLabel[maturity.maturityStage]}
        </Badge>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">{maturity.trendMessage}</p>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <span>Weekly verification load</span>
          <span>
            {maturity.hasEnoughRealData ? "Your trend" : "Typical learning curve — yours will vary"}
          </span>
        </div>

        <div className="grid grid-cols-12 items-end gap-1.5 sm:gap-2" role="img" aria-label="Weekly verification chart">
          {maturity.weeklyCounts.map((bucket, index) => {
            const expected = maturity.expectedCurve[index];
            const actualHeight = `${Math.max(8, (bucket.count / maxCount) * 100)}%`;
            const expectedHeight = `${Math.max(8, ((expected?.count ?? 0) / maxCount) * 100)}%`;

            return (
              <div key={bucket.weekStart} className="flex min-w-0 flex-col items-center gap-1">
                <div className="relative flex h-24 w-full items-end justify-center">
                  {!maturity.hasEnoughRealData ? (
                    <div
                      className="absolute bottom-0 w-full max-w-5 rounded-t border border-dashed border-muted-foreground/40 bg-transparent"
                      style={{ height: expectedHeight }}
                      aria-hidden
                    />
                  ) : null}
                  <div
                    className={cn(
                      "relative z-[1] w-full max-w-5 rounded-t bg-primary/80",
                      bucket.count === 0 && "bg-muted-foreground/20",
                    )}
                    style={{ height: actualHeight }}
                    title={`${bucket.count} verification${bucket.count === 1 ? "" : "s"}`}
                  />
                </div>
                <span className="truncate text-[10px] text-muted-foreground">{formatWeekLabel(bucket.weekStart)}</span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary/80" />
            Your verifications
          </span>
          {!maturity.hasEnoughRealData ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-muted-foreground/40" />
              Typical learning curve
            </span>
          ) : null}
        </div>
      </div>

      {maturity.celebrateTrend ? (
        <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
          Nice — fewer verification prompts than your prior month. The assistant is getting quieter.
        </p>
      ) : null}
    </div>
  );
}
