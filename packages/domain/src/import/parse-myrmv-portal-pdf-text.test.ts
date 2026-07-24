import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseMyRmvPortalPdfText } from "./parse-myrmv-portal-pdf-text.js";
import { parseRmvPdfText } from "./parse-rmv-pdf-text.js";

const fixturePath = resolve(import.meta.dirname, "fixtures/myrmv-pdf-snippet.txt");

describe("parseMyRmvPortalPdfText", () => {
  it("extracts title and registration from Massachusetts myRMV portal print layout", () => {
    const text = readFileSync(fixturePath, "utf8");
    const result = parseMyRmvPortalPdfText(text);

    expect(result).not.toBeNull();
    expect(result?.records).toHaveLength(2);

    const title = result?.records.find((record) => record.eventType === "title");
    expect(title?.recordDate).toBe("2026-01-21");
    expect(title?.description).toContain("CM185996");
    expect(title?.details.some((line) => line.includes("19UUB6F47MA008400"))).toBe(true);

    const registration = result?.records.find((record) => record.eventType === "registration");
    expect(registration?.recordDate).toBe("2024-10-01");
    expect(registration?.description).toContain("3KXT69");
    expect(registration?.details.some((line) => line.includes("2026-09-30"))).toBe(true);
  });

  it("parseRmvPdfText prefers myRMV portal layout over CARFAX-style blocks", () => {
    const text = readFileSync(fixturePath, "utf8");
    const result = parseRmvPdfText(text);
    expect(result.records).toHaveLength(2);
    expect(result.records.every((record) => record.agency.includes("myRMV"))).toBe(true);
  });
});
