export type OwnerHabitCaptureChannel = "voice" | "text";
export type OwnerHabitExtractionMethod = "rules" | "llm";

/** Public handoff contract shared by today's rules parser and a future LLM extractor. */
export type OwnerHabitProposalV1 = {
  version: "1";
  entryId: string;
  serviceName: string;
  intervalMiles: number | null;
  intervalMonths: number | null;
  basis: "mileage" | "time" | "mixed";
  captureChannel: OwnerHabitCaptureChannel;
  extractionMethod: OwnerHabitExtractionMethod;
  sourceText: string;
  confidence: number;
};
