import { EVENT_TYPES, EVENT_VERSIONS } from "../events/catalog.js";
import type { QuoteAnalysisResult } from "../quotes/analyze-dealer-quote.js";
import type { EventStore } from "../ports/event-store.js";

export const recordQuoteAnalysis = async (deps: {
  eventStore: EventStore;
  vehicleId: string;
  rawText: string;
  analysis: QuoteAnalysisResult;
}) => {
  const analyzedAt = new Date().toISOString();
  const correlationId = crypto.randomUUID();

  await deps.eventStore.append({
    aggregateType: "quote",
    aggregateId: deps.analysis.quoteId,
    eventType: EVENT_TYPES.QUOTE_ANALYZED,
    eventVersion: EVENT_VERSIONS[EVENT_TYPES.QUOTE_ANALYZED],
    payload: {
      vehicleId: deps.vehicleId,
      quoteId: deps.analysis.quoteId,
      shop: deps.analysis.shop,
      rawText: deps.rawText,
      lines: deps.analysis.lines,
      totalQuoted: deps.analysis.totalQuoted,
      totalFairHigh: deps.analysis.totalFairHigh,
      summary: deps.analysis.summary,
      analyzedAt,
    },
    correlationId,
  });

  return { ...deps.analysis, analyzedAt };
};
