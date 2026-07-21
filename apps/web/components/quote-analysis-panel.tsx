"use client";

import { useState } from "react";

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
    <section className="quote-panel">
      <label>
        Paste dealer quote
        <textarea
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          rows={6}
          disabled={disabled || isBusy}
        />
      </label>
      <button type="button" disabled={disabled || isBusy || rawText.trim().length === 0} onClick={() => void analyze()}>
        Analyze quote
      </button>
      {error ? <p className="settings-error">{error}</p> : null}

      {display ? (
        <div className="quote-result">
          <p className="quote-summary">{display.summary}</p>
          <p className="muted">
            Quoted ${display.totalQuoted.toFixed(2)} · typical upper bound ~${display.totalFairHigh.toFixed(2)}
          </p>
          <ul className="quote-lines">
            {display.lines.map((line) => (
              <li key={`${line.description}-${line.quotedAmount}`} className={`quote-line quote-${line.verdict}`}>
                <div>
                  <strong>{line.description}</strong>
                  <span>${line.quotedAmount.toFixed(2)}</span>
                </div>
                <p>
                  <span className={`badge ${line.verdict === "high" ? "badge-warning" : ""}`}>
                    {verdictLabel[line.verdict]}
                  </span>{" "}
                  Fair range ${line.fairMin.toFixed(0)}–${line.fairMax.toFixed(0)} · {line.reason}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
