"use client";

import { useState } from "react";
import { FormActions, FormField } from "@/components/form-field";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type QuoteLine = {
  description: string;
  quotedAmount: number;
  fairMin: number;
  fairMax: number;
  verdict: "fair" | "high" | "optional" | "necessary" | "unknown";
  reason: string;
};

export type QuoteAnalysisView = {
  quoteId: string;
  shop?: string;
  summary: string;
  totalQuoted: number;
  totalFairHigh: number;
  analyzedAt: string;
  lines: QuoteLine[];
};

type QuoteAnalysisPanelProps = {
  vehicleId: string;
  apiBase: string;
  disabled?: boolean;
  history: QuoteAnalysisView[];
  onAnalyzed: (analysis: QuoteAnalysisView) => void;
};

const sampleQuote = `Dealer service quote
Oil change (synthetic) $149.00
Cabin air filter $59.00
Tire rotation $49.99`;

const verdictLabel: Record<QuoteLine["verdict"], string> = {
  fair: "Fair",
  high: "High",
  optional: "Optional",
  necessary: "Necessary",
  unknown: "Review",
};

const verdictBadge = (verdict: QuoteLine["verdict"]) => {
  if (verdict === "high") return "warning" as const;
  if (verdict === "optional") return "secondary" as const;
  return "default" as const;
};

export function QuoteAnalysisPanel({
  vehicleId,
  apiBase,
  disabled,
  history,
  onAnalyzed,
}: QuoteAnalysisPanelProps) {
  const [rawText, setRawText] = useState(sampleQuote);
  const [latest, setLatest] = useState<QuoteAnalysisView | null>(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const analyze = async () => {
    setIsBusy(true);
    setError("");
    try {
      const response = await fetch(`${apiBase}/api/vehicles/${vehicleId}/quotes/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const body = (await response.json()) as {
        analysis?: QuoteAnalysisView;
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Quote analysis failed");

      const analysis = body.analysis!;
      setLatest(analysis);
      onAnalyzed(analysis);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Quote analysis failed");
    } finally {
      setIsBusy(false);
    }
  };

  const display = latest ?? history.at(-1) ?? null;

  return (
    <div className="space-y-4">
      <FormField label="Paste dealer quote" htmlFor="quote-text">
        <Textarea
          id="quote-text"
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          rows={6}
          disabled={disabled || isBusy}
        />
      </FormField>
      <Button type="button" disabled={disabled || isBusy || rawText.trim().length === 0} onClick={() => void analyze()}>
        {isBusy ? "Analyzing…" : "Analyze quote"}
      </Button>
      {error ? <Alert variant="destructive">{error}</Alert> : null}

      {display ? (
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-sm font-medium">{display.summary}</p>
          <p className="text-xs text-muted-foreground">
            Quoted ${display.totalQuoted.toFixed(2)} · typical upper bound ~${display.totalFairHigh.toFixed(2)}
          </p>
          <ul className="space-y-3">
            {display.lines.map((line) => (
              <li key={`${line.description}-${line.quotedAmount}`} className="rounded-md border border-border bg-card p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{line.description}</strong>
                  <span className="font-mono text-sm">${line.quotedAmount.toFixed(2)}</span>
                </div>
                <p className="mt-2 text-muted-foreground">
                  <Badge variant={verdictBadge(line.verdict)} className="mr-2">
                    {verdictLabel[line.verdict]}
                  </Badge>
                  Fair ${line.fairMin.toFixed(0)}–${line.fairMax.toFixed(0)} · {line.reason}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
