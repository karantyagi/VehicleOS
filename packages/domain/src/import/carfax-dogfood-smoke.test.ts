import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { enrichVehicleOsImport, tierImportRows, type VehicleOsImportDraft } from "@vehicleos/domain";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../connectors/carfax-connect/examples/tlx-carfax-history.v1.json",
);

describe("CARFAX TLX dogfood smoke", () => {
  it("enriches and tiers the dogfood fixture with high ready ratio", () => {
    const raw = readFileSync(fixturePath, "utf8");
    const draft = JSON.parse(raw) as VehicleOsImportDraft;
    const enriched = enrichVehicleOsImport(draft);
    const summary = tierImportRows(enriched.services);

    expect(enriched.services.length).toBeGreaterThan(20);
    expect(summary.blockCount).toBe(0);
    expect(summary.readyCount + summary.verifyCount).toBe(enriched.services.length);
    expect(summary.readyCount / enriched.services.length).toBeGreaterThan(0.7);

    const withLocation = enriched.services.filter((service) => service.shopLocation?.trim()).length;
    expect(withLocation / enriched.services.length).toBeGreaterThan(0.75);
  });

  it("strips boilerplate line items on representative rows", () => {
    const raw = readFileSync(fixturePath, "utf8");
    const draft = JSON.parse(raw) as VehicleOsImportDraft;
    const enriched = enrichVehicleOsImport(draft);
    const rotated = enriched.services.find((service) =>
      service.lineItems.some((line) => line.toLowerCase().includes("tire")),
    );

    expect(rotated).toBeDefined();
    expect(rotated?.lineItems.some((line) => line === "Vehicle serviced")).toBe(false);
  });
});
