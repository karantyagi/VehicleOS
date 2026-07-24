import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCarfaxPdfText } from "./parse-carfax-pdf-text.js";

const fixturePath = resolve(import.meta.dirname, "fixtures/carfax-pdf-snippet.txt");

describe("parseCarfaxPdfText", () => {
  it("extracts dated service rows from CARFAX print-to-PDF text", () => {
    const text = readFileSync(fixturePath, "utf8");
    const result = parseCarfaxPdfText(text);

    expect(result.services.length).toBeGreaterThanOrEqual(2);
    expect(result.services.some((row) => row.shop.includes("Costco"))).toBe(true);
    expect(result.services.some((row) => row.lineItems.some((item) => item.includes("Tires rotated")))).toBe(
      true,
    );
    expect(result.maxMileage).toBeGreaterThan(50_000);
  });

  it("skips Massachusetts Motor Vehicle Dept ownership-only rows", () => {
    const text = [
      "Massachusetts Motor Vehicle Dept.",
      "Date",
      "01/21/2026",
      "Services Performed",
      "Title issued or updated",
      "Registration updated when owner moved the vehicle to a new location",
    ].join("\n");

    const result = parseCarfaxPdfText(text);
    expect(result.services).toHaveLength(0);
  });
});
