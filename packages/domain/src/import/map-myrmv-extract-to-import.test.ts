import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractMyRmvMaVehiclePageFromPdfText } from "./extract-myrmv-ma-vehicle-page.js";
import { mapMyRmvExtractToImport } from "./map-myrmv-extract-to-import.js";

const fixturePath = resolve(import.meta.dirname, "fixtures/myrmv-pdf-snippet.txt");

describe("MyRmvMa extract → import pipeline", () => {
  it("populates fixed portal keys from myRMV PDF text", () => {
    const text = readFileSync(fixturePath, "utf8");
    const extract = extractMyRmvMaVehiclePageFromPdfText({ rawText: text });

    expect(extract).not.toBeNull();
    expect(extract?.portal).toBe("myrmv-ma");
    expect(extract?.vehicle.vin).toBe("19UUB6F47MA008400");
    expect(extract?.registration.plate).toBe("3KXT69");
    expect(extract?.title.titleNumber).toBe("CM185996");
    expect(extract?.owner.licenseIssued).toBe("2024-04-16");
    expect(extract?.owner.dateOfBirth).toBe("1991-09-21");
  });

  it("maps extract layer to VehicleOsRmvImport v1", () => {
    const text = readFileSync(fixturePath, "utf8");
    const extract = extractMyRmvMaVehiclePageFromPdfText({ rawText: text });
    expect(extract).not.toBeNull();

    const draft = mapMyRmvExtractToImport({
      extract: extract!,
      vehicleDefaults: {
        vin: "19UUB6F47MA008400",
        year: 2021,
        make: "Acura",
        model: "TLX",
        currentMileage: 58_819,
      },
    });

    expect(draft.version).toBe("1");
    expect(draft.records).toHaveLength(2);
    expect(draft.vehicle.vin).toBe("19UUB6F47MA008400");
  });
});
