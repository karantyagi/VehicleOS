import { describe, expect, it } from "vitest";
import { processExtractJob } from "./extract.js";

describe("processExtractJob", () => {
  it("returns structured extraction fields", () => {
    const result = processExtractJob({
      vehicleId: "vehicle-1",
      documentId: "doc-1",
      storageKey: "receipts/demo.pdf",
      shop: "Honda dealer",
      mileage: 42_100,
    });

    expect(result.job).toBe("extract");
    expect(result.extracted.shop).toBe("Honda dealer");
    expect(result.extracted.mileage).toBe(42_100);
    expect(result.extracted.confidence).toBeGreaterThan(0);
  });
});
