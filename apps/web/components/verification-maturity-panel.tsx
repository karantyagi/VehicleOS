"use client";

import type { VerificationMaturityView } from "@/lib/console-types";

type VerificationMaturityPanelProps = {
  maturity: VerificationMaturityView;
};

type ChartPoint = { x: number; y: number };

const CHART_WIDTH = 320;
const CHART_HEIGHT = 88;
const PAD = { top: 10, right: 12, bottom: 22, left: 28 };

const insightHeadline = (maturity: VerificationMaturityView): string => {
  if (maturity.celebrateTrend) return "Getting quieter";
  if (maturity.maturityStage === "steady") return "Mostly quiet now";
  if (maturity.maturityStage === "onboarding") return "Still learning your car";
  return "Questions taper over time";
};

const toLinePoints = (counts: number[], maxCount: number): ChartPoint[] => {
  const innerWidth = CHART_WIDTH - PAD.left - PAD.right;
  const innerHeight = CHART_HEIGHT - PAD.top - PAD.bottom;
  const lastIndex = Math.max(counts.length - 1, 1);

  return counts.map((count, index) => ({
    x: PAD.left + (index / lastIndex) * innerWidth,
    y: PAD.top + innerHeight - (count / maxCount) * innerHeight,
  }));
};

const toPolyline = (points: ChartPoint[]): string =>
  points.map((point) => `${point.x},${point.y}`).join(" ");

export function VerificationMaturityPanel({ maturity }: VerificationMaturityPanelProps) {
  const actualCounts = maturity.weeklyCounts.map((bucket) => bucket.count);
  const expectedCounts = maturity.expectedCurve.map((bucket) => bucket.count);
  const maxCount = Math.max(1, ...actualCounts, ...expectedCounts);

  const actualPoints = toLinePoints(actualCounts, maxCount);
  const expectedPoints = toLinePoints(expectedCounts, maxCount);
  const firstWeek = maturity.weeklyCounts[0]?.weekStart;
  const firstLabel = firstWeek
    ? new Date(`${firstWeek}T12:00:00.000Z`).toLocaleDateString(undefined, { month: "short" })
    : "";

  const chartLabel = maturity.hasEnoughRealData
    ? "Your questions per week — trending down over time"
    : "Typical path — fewer questions each week as memory builds";

  return (
    <div className="rounded-xl border border-border/70 bg-muted/15 px-4 py-3">
      <p className="text-sm font-medium text-foreground">{insightHeadline(maturity)}</p>

      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="mt-2 h-[88px] w-full"
        role="img"
        aria-label={chartLabel}
      >
        <line
          x1={PAD.left}
          y1={CHART_HEIGHT - PAD.bottom}
          x2={CHART_WIDTH - PAD.right}
          y2={CHART_HEIGHT - PAD.bottom}
          className="stroke-border"
          strokeWidth="1"
        />
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={CHART_HEIGHT - PAD.bottom}
          className="stroke-border"
          strokeWidth="1"
        />
        <text x={PAD.left - 4} y={PAD.top + 4} textAnchor="end" className="fill-muted-foreground text-[9px]">
          {maxCount}
        </text>
        <text
          x={PAD.left - 4}
          y={CHART_HEIGHT - PAD.bottom}
          textAnchor="end"
          className="fill-muted-foreground text-[9px]"
        >
          0
        </text>
        <text x={PAD.left} y={CHART_HEIGHT - 4} className="fill-muted-foreground text-[9px]">
          {firstLabel}
        </text>
        <text x={CHART_WIDTH - PAD.right} y={CHART_HEIGHT - 4} textAnchor="end" className="fill-muted-foreground text-[9px]">
          Now
        </text>
        <polyline
          points={toPolyline(expectedPoints)}
          fill="none"
          className="stroke-muted-foreground/45"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <polyline
          points={toPolyline(actualPoints)}
          fill="none"
          className="stroke-primary"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {actualPoints.map((point, index) => (
          <circle
            key={maturity.weeklyCounts[index]?.weekStart ?? index}
            cx={point.x}
            cy={point.y}
            r="2.5"
            className="fill-primary"
          />
        ))}
      </svg>

      <div className="mt-1 flex flex-wrap gap-4 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded bg-primary" />
          You
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded border-t border-dashed border-muted-foreground/60" />
          Typical
        </span>
      </div>
    </div>
  );
}
