import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractCarfaxServiceHistoryFromPdfText } from "./extract-carfax-service-history.js";
import { mapCarfaxExtractToImport } from "./map-carfax-extract-to-import.js";

const fixturePath = resolve(import.meta.dirname, "fixtures/carfax-pdf-snippet.txt");

describe("Carfax extract → import pipeline", () => {
  it("populates fixed portal keys per service row", () => {
    const text = readFileSync(fixturePath, "utf8");
    const extract = extractCarfaxServiceHistoryFromPdfText({ rawText: text });

    expect(extract.portal).toBe("carfax-car-care");
    expect(extract.serviceRows.length).toBeGreaterThanOrEqual(2);
    expect(extract.serviceRows[0]).toMatchObject({
      shop: expect.any(String),
      serviceDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      mileage: expect.any(Number),
      lineItems: expect.arrayContaining([expect.any(String)]),
    });
  });

  it("maps extract layer to VehicleOSImport v1", () => {
    const text = readFileSync(fixturePath, "utf8");
    const extract = extractCarfaxServiceHistoryFromPdfText({ rawText: text });
    const draft = mapCarfaxExtractToImport({
      extract,
      vehicleDefaults: {
        vin: "19UUB6F47MA008400",
        year: 2021,
        make: "Acura",
        model: "TLX",
        currentMileage: 50_000,
      },
    });

    expect(draft.version).toBe("1");
    expect(draft.services.length).toBe(extract.serviceRows.length);
    expect(draft.vehicle.currentMileage).toBeGreaterThanOrEqual(50_000);
  });
});
