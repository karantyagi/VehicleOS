import { describe, expect, it } from "vitest";
import { analyzeDealerQuote, parseQuoteText } from "./analyze-dealer-quote.js";

describe("parseQuoteText", () => {
  it("extracts description and amount per line", () => {
    const lines = parseQuoteText(`Jiffy Lube
Oil change (synthetic) $89.99
Cabin air filter $59.00`);

    expect(lines).toHaveLength(2);
    expect(lines[0]?.description).toContain("Oil change");
    expect(lines[0]?.quotedAmount).toBe(89.99);
  });
});

describe("analyzeDealerQuote", () => {
  it("flags high oil change and optional cabin filter", () => {
    const result = analyzeDealerQuote({
      rawText: `Dealer service quote
Oil change (synthetic) $149.00
Cabin air filter $45.00`,
    });

    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]?.verdict).toBe("high");
    expect(result.lines[1]?.verdict).toBe("optional");
    expect(result.summary).toMatch(/high/i);
  });

  it("returns helpful summary when nothing parses", () => {
    const result = analyzeDealerQuote({ rawText: "No prices here" });
    expect(result.lines).toHaveLength(0);
    expect(result.summary).toMatch(/Could not parse/i);
  });
});
