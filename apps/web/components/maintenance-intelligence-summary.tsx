import { Clock3, ExternalLink, MapPin, Sparkles, WalletCards } from "lucide-react";
import type {
  MaintenanceItemIntelligence,
  QualitativeConfidence,
} from "@vehicleos/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MaintenanceIntelligenceSummaryProps = {
  intelligence: MaintenanceItemIntelligence;
  className?: string;
  showWhy?: boolean;
  showInterval?: boolean;
  showAction?: boolean;
};

const confidenceLabel: Record<QualitativeConfidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
  not_scored: "Not scored yet",
};

const axisStateLabel = {
  available: "Used",
  missing: "Needed",
  upcoming: "Upcoming",
  not_applicable: "N/A",
} as const;

const formatMiles = (value: number): string =>
  `${value.toLocaleString("en-US")} miles`;

export function MaintenanceIntelligenceSummary({
  intelligence,
  className,
  showWhy = true,
  showInterval = true,
  showAction = true,
}: MaintenanceIntelligenceSummaryProps) {
  const interval = intelligence.intervalRecommendation;
  const action = intelligence.actionRecommendation;

  return (
    <div className={cn("space-y-4", className)}>
      {showWhy ? (
        <section className="rounded-lg border border-border/70 bg-background/75 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Why this reminder</p>
          <Badge variant="outline" className="font-normal">
            {confidenceLabel[intelligence.reminderConfidence]}
          </Badge>
        </div>
        <p className="mt-1.5 text-sm tabular-nums text-muted-foreground">
          {intelligence.whyNow}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {intelligence.axes.map((axis) => (
            <div key={axis.id} className="rounded-md bg-muted/45 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">{axis.label}</p>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {axisStateLabel[axis.state]}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {axis.summary || "Owner input would improve this signal."}
              </p>
            </div>
          ))}
        </div>
        </section>
      ) : null}

      {showInterval ? (
        <section className="rounded-lg border border-primary/25 bg-primary/[0.035] p-3.5">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 flex-1">
              {interval.status === "active" && interval.recommendedMiles ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      Assistant recommends {formatMiles(interval.recommendedMiles)}
                    </p>
                    <Badge variant="outline" className="font-normal">
                      {confidenceLabel[interval.confidence]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {interval.evidenceNote}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{interval.rationale}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-foreground">
                    Assistant interval recommendation
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Upcoming · in development for this item. The active deterministic interval remains in use.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {showAction ? (
        <section className="rounded-lg border border-border/70 bg-background/75 p-3.5">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Recommended way to get it done</p>
            {action.status === "active" && action.providerName ? (
              <>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {action.providerName}
                  {action.providerLocation ? ` · ${action.providerLocation}` : ""}
                </p>
                <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {action.method === "tire_retailer" ? "Tire center" : "Service provider"}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden />
                    {action.expectedTimeLabel}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <WalletCards className="h-3.5 w-3.5" aria-hidden />
                    {action.expectedCost.label}
                  </p>
                </div>
                {action.whyThisOption.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-foreground">Why this option</p>
                    <ul className="mt-1 space-y-1 text-xs leading-relaxed text-muted-foreground">
                      {action.whyThisOption.map((reason) => (
                        <li key={reason}>• {reason}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-normal">
                    Provider {action.confidence.provider}
                  </Badge>
                  <Badge variant="outline" className="font-normal">
                    Cost {action.confidence.cost}
                  </Badge>
                  {action.nextAction.url ? (
                    <Button asChild size="sm" variant="outline" className="ml-auto">
                      <a href={action.nextAction.url} target="_blank" rel="noreferrer">
                        {action.nextAction.label}
                        <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Phase 2 · upcoming · in development for this item.
              </p>
            )}
          </div>
        </div>
        </section>
      ) : null}
    </div>
  );
}
