import { describe, expect, it } from "vitest";
import { MAX_RESEARCH_INPUT_CHARS, parseOpenAiResearchResponse } from "./openai-extractor.js";

describe("research OpenAI extractor boundary", () => {
  it("accepts only a schema-shaped structured output", () => {
    expect(
      parseOpenAiResearchResponse({
        output_text: JSON.stringify({
          documentType: "carfax-service-history",
          vehicleVin: null,
          records: [
            {
              serviceDate: "2025-01-02",
              mileage: 12000,
              provider: "Example Auto",
              lineItems: ["Oil and filter changed"],
              confidence: 0.9,
              evidence: "Jan 02 2025 12,000 miles",
            },
          ],
          warnings: [],
        }),
      }),
    ).toMatchObject({ documentType: "carfax-service-history", records: [{ mileage: 12000 }] });
  });

  it("does not trust malformed model output", () => {
    expect(parseOpenAiResearchResponse({ output_text: "{\"records\":[{\"mileage\":\"12k\"}]}" })).toBeNull();
    expect(MAX_RESEARCH_INPUT_CHARS).toBe(60_000);
  });
});
